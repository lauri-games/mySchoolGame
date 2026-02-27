"""
main.py – Schritt 1: Fenster, Game-Loop, Tile-Level, Spieler mit Kollision.

Starten:  python main.py
Beenden:  ESC oder Fenster schließen
"""

import sys
import math
import pygame

from settings import *
from sprites import Camera, Wall, Locker, Floor, Player, draw_fov


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def draw_text(surface: pygame.Surface, text: str, size: int,
              color: tuple, x: int, y: int, align: str = "center"):
    font = pygame.font.SysFont("segoeui", size, bold=True)
    txt  = font.render(text, True, color)
    rect = txt.get_rect()
    if align == "center":
        rect.center = (x, y)
    elif align == "topleft":
        rect.topleft = (x, y)
    surface.blit(txt, rect)


# ---------------------------------------------------------------------------
# Haupt-Spielklasse
# ---------------------------------------------------------------------------

class Game:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption(TITLE)
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        self.clock  = pygame.time.Clock()
        self.state  = "menu"      # "menu" | "playing" | "gameover" | "win"

    # ------------------------------------------------------------------
    # Level laden
    # ------------------------------------------------------------------

    def load_level(self):
        """Parst LEVEL_MAP, erstellt alle Sprites und setzt Spieler-Startpos."""

        # Sprite-Gruppen
        self.all_sprites    = pygame.sprite.Group()
        self.walls          = pygame.sprite.Group()
        self.lockers        = pygame.sprite.Group()
        self.floors         = pygame.sprite.Group()

        self.player         : Player | None = None
        self.enemy_spawns   : list[tuple[int, int]] = []

        map_cols = max(len(row) for row in LEVEL_MAP)
        map_rows = len(LEVEL_MAP)

        for row_idx, row in enumerate(LEVEL_MAP):
            for col_idx, tile in enumerate(row):
                # Immer Bodenkachel legen (außer unter Wänden wird sie verdeckt)
                Floor((self.floors, self.all_sprites), col_idx, row_idx)

                if tile == TILE_WALL:
                    Wall((self.walls, self.all_sprites), col_idx, row_idx)

                elif tile == TILE_LOCKER:
                    loc = Locker((self.lockers, self.all_sprites), col_idx, row_idx)
                    # Schließfächer blockieren auch den Weg
                    self.walls.add(loc)

                elif tile == TILE_PLAYER:
                    obstacles = pygame.sprite.Group()      # wird nachher gefüllt
                    self.player = Player(
                        (self.all_sprites,),
                        obstacles,
                        col_idx, row_idx
                    )

                elif tile == TILE_ENEMY:
                    self.enemy_spawns.append((col_idx, row_idx))

        if self.player is None:
            raise RuntimeError("Kein Spieler-Startpunkt 'P' in der LEVEL_MAP!")

        # Hindernisse für Kollision: Wände + Schließfächer
        # (werden erst hier korrekt befüllt, da Locker erst später zur walls-Group hinzukam)
        self.player.obstacles = self.walls

        # Kamera setzt die Kartengrenze
        self.camera = Camera(map_cols * TILESIZE, map_rows * TILESIZE)

        # Spielzeit
        self.survive_time = 60          # Sekunden
        self.elapsed      = 0.0

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.quit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    if self.state == "playing":
                        self.state = "menu"
                    else:
                        self.quit()
                # Menü / Game-Over / Win → weiter mit beliebiger Taste
                if self.state in ("menu", "gameover", "win"):
                    if event.key == pygame.K_RETURN:
                        self.new_game()

                # Verstecken per 'E' (Schritt 2: vollständige Mechanik)
                if self.state == "playing" and event.key == pygame.K_e:
                    self._toggle_hide()

    def _toggle_hide(self):
        if self.player.hidden:
            self.player.unhide()
            return
        # Prüfen ob Spieler neben einem Schließfach steht
        for locker in self.lockers:
            if locker.rect in (pygame.Rect,):
                pass
            dist = self.player.pos.distance_to(
                pygame.Vector2(locker.rect.center))
            if dist < TILESIZE * 1.2:
                self.player.hide()
                return

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, dt: float):
        if self.state != "playing":
            return

        self.elapsed += dt
        if self.elapsed >= self.survive_time:
            self.state = "win"
            return

        self.all_sprites.update(dt)
        self.camera.update(self.player)

    # ------------------------------------------------------------------
    # Zeichnen
    # ------------------------------------------------------------------

    def draw(self):
        self.screen.fill(DARKGREY)

        if self.state == "menu":
            self._draw_menu()
        elif self.state in ("playing", "gameover", "win"):
            self._draw_game()
            if self.state == "gameover":
                self._draw_overlay("ERWISCHT!", RED,
                                   "Drücke ENTER für Neustart")
            elif self.state == "win":
                self._draw_overlay("ÜBERLEBT!", GREEN,
                                   "Drücke ENTER für Neustart")

        pygame.display.flip()

    def _draw_menu(self):
        self.screen.fill(DARKGREY)
        # Titel-Hintergrundbalken
        bar = pygame.Surface((WIDTH, 100), pygame.SRCALPHA)
        bar.fill((0, 0, 0, 120))
        self.screen.blit(bar, (0, HEIGHT // 2 - 100))

        draw_text(self.screen, TITLE,          48, YELLOW,  WIDTH // 2, HEIGHT // 2 - 60)
        draw_text(self.screen, "Überlebe 60 Sekunden in der Schule!", 24,
                  LIGHTGREY, WIDTH // 2, HEIGHT // 2)
        draw_text(self.screen, "WASD = Bewegen   E = Verstecken   ESC = Menü",
                  20, GREY, WIDTH // 2, HEIGHT // 2 + 40)
        draw_text(self.screen, "ENTER zum Starten", 28, WHITE,
                  WIDTH // 2, HEIGHT // 2 + 100)

    def _draw_game(self):
        # --- Kacheln + Sprites (mit Kamera-Offset) ---
        for sprite in self.all_sprites:
            self.screen.blit(sprite.image, self.camera.apply(sprite.rect))

        # --- Demo-Sichtkegel (wird in Schritt 2 an Gegner übergeben) ---
        # Für jetzt: zeigen wir exemplarisch einen Kegel an einer festen Position
        # (wird in Schritt 2 durch echte Gegner ersetzt)

        # --- HUD ---
        remaining = max(0, self.survive_time - self.elapsed)
        minutes   = int(remaining) // 60
        seconds   = int(remaining) % 60
        timer_str = f"{minutes:01d}:{seconds:02d}"

        # Timer-Hintergrund
        hud_surf = pygame.Surface((160, 44), pygame.SRCALPHA)
        hud_surf.fill((0, 0, 0, 140))
        self.screen.blit(hud_surf, (WIDTH // 2 - 80, 8))
        draw_text(self.screen, f"Zeit: {timer_str}", 28, WHITE, WIDTH // 2, 30)

        # Status-Meldung wenn versteckt
        if self.player.hidden:
            draw_text(self.screen, "[ VERSTECKT ]", 22, BLUE,
                      WIDTH // 2, HEIGHT - 36)

        # Debug-Infos (Spielerposition)
        px, py = int(self.player.pos.x), int(self.player.pos.y)
        draw_text(self.screen,
                  f"Pos: ({px}, {py})  Winkel: {self.player.angle:.0f}°",
                  16, GREY, WIDTH // 2, HEIGHT - 14)

    def _draw_overlay(self, headline: str, color: tuple, sub: str):
        overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160))
        self.screen.blit(overlay, (0, 0))
        draw_text(self.screen, headline, 72, color, WIDTH // 2, HEIGHT // 2 - 40)
        draw_text(self.screen, sub, 26, WHITE, WIDTH // 2, HEIGHT // 2 + 30)

    # ------------------------------------------------------------------
    # Spielstart / Beenden
    # ------------------------------------------------------------------

    def new_game(self):
        self.load_level()
        self.state = "playing"

    def quit(self):
        pygame.quit()
        sys.exit()

    # ------------------------------------------------------------------
    # Haupt-Loop
    # ------------------------------------------------------------------

    def run(self):
        while True:
            dt = self.clock.tick(FPS) / 1000.0   # Sekunden seit letztem Frame
            self.events()
            self.update(dt)
            self.draw()


# ---------------------------------------------------------------------------
# Einstiegspunkt
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    game = Game()
    game.run()
