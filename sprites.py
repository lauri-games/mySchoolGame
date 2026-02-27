"""
sprites.py – Alle Spielobjekte als pygame.sprite.Sprite-Unterklassen.

Jede Klasse versucht zuerst, eine echte PNG-Grafik zu laden
(z. B. assets/player.png). Schlägt das fehl, wird eine ansprechende
prozedurale Surface erstellt, die man später einfach ersetzen kann.
"""

import pygame
import math
import os
from settings import *


# ---------------------------------------------------------------------------
# Hilfsfunktionen – prozedurale Grafiken
# ---------------------------------------------------------------------------

def _try_load(path: str, size: tuple[int, int]):
    """Versucht ein Bild zu laden; gibt None zurück wenn nicht vorhanden."""
    if os.path.exists(path):
        img = pygame.image.load(path).convert_alpha()
        return pygame.transform.smoothscale(img, size)
    return None


def _make_player_surface(radius: int) -> pygame.Surface:
    """
    Erstellt eine prozedurale Spieler-Surface.
    Zeigt einen Körper-Kreis + Kopf-Kreis + kleinen Richtungspfeil (nach oben = 0°).
    Der Sprite wird später per Rotation gedreht.
    """
    size = radius * 2 + 4
    surf = pygame.Surface((size, size), pygame.SRCALPHA)
    cx, cy = size // 2, size // 2

    # Körper
    pygame.draw.circle(surf, PLAYER_COLOR,    (cx, cy), radius)
    pygame.draw.circle(surf, PLAYER_OUTLINE,  (cx, cy), radius, 2)

    # Schultern-Linie
    shoulder_w = int(radius * 0.85)
    pygame.draw.line(surf, PLAYER_OUTLINE,
                     (cx - shoulder_w, cy + 2), (cx + shoulder_w, cy + 2), 3)

    # Kopf (oben = Blickrichtung)
    head_r = int(radius * 0.42)
    head_y = cy - int(radius * 0.52)
    pygame.draw.circle(surf, CREAM,           (cx, head_y), head_r)
    pygame.draw.circle(surf, PLAYER_OUTLINE,  (cx, head_y), head_r, 2)

    # Richtungspfeil
    tip   = (cx,            cy - radius + 3)
    left  = (cx - 5,        cy - radius + 11)
    right = (cx + 5,        cy - radius + 11)
    pygame.draw.polygon(surf, WHITE, [tip, left, right])

    return surf


def _make_enemy_surface(radius: int, color: tuple) -> pygame.Surface:
    """
    Prozedurale Gegner-Surface (Schultern, Kopf, Richtungsdreieck).
    Farbe wird von außen übergeben, damit Alert/Chase-Zustand das Aussehen ändert.
    """
    size = radius * 2 + 4
    surf = pygame.Surface((size, size), pygame.SRCALPHA)
    cx, cy = size // 2, size // 2

    outline = tuple(max(0, c - 60) for c in color)

    # Körper
    pygame.draw.circle(surf, color,    (cx, cy), radius)
    pygame.draw.circle(surf, outline,  (cx, cy), radius, 2)

    # Schultern
    shoulder_w = int(radius * 0.85)
    pygame.draw.line(surf, outline,
                     (cx - shoulder_w, cy + 2), (cx + shoulder_w, cy + 2), 3)

    # Kopf
    head_r = int(radius * 0.42)
    head_y = cy - int(radius * 0.52)
    pygame.draw.circle(surf, CREAM,   (cx, head_y), head_r)
    pygame.draw.circle(surf, outline, (cx, head_y), head_r, 2)

    # Richtungsdreieck
    tip   = (cx,        cy - radius + 3)
    left  = (cx - 5,    cy - radius + 11)
    right = (cx + 5,    cy - radius + 11)
    pygame.draw.polygon(surf, outline, [tip, left, right])

    return surf


def _make_wall_surface(tile_size: int) -> pygame.Surface:
    surf = pygame.Surface((tile_size, tile_size))
    surf.fill(COLOR_WALL)
    # obere Highlight-Kante
    pygame.draw.rect(surf, COLOR_WALL_TOP, (0, 0, tile_size, 6))
    # leichte Rasterlinien
    pygame.draw.rect(surf, DARKGREY, (0, 0, tile_size, tile_size), 1)
    return surf


def _make_locker_surface(tile_size: int) -> pygame.Surface:
    surf = pygame.Surface((tile_size, tile_size))
    surf.fill(COLOR_LOCKER)
    # Tür-Rahmen
    pygame.draw.rect(surf, COLOR_LOCKER_DOOR,
                     (4, 4, tile_size - 8, tile_size - 8), 3)
    # Türgriff
    handle_x = tile_size // 2 + 6
    pygame.draw.circle(surf, LIGHTGREY, (handle_x, tile_size // 2), 3)
    pygame.draw.rect(surf, DARKGREY, (0, 0, tile_size, tile_size), 1)
    return surf


def _make_floor_surface(tile_size: int, dark: bool = False) -> pygame.Surface:
    surf = pygame.Surface((tile_size, tile_size))
    color = COLOR_FLOOR_DARK if dark else COLOR_FLOOR
    surf.fill(color)
    pygame.draw.rect(surf, (color[0] - 15, color[1] - 15, color[2] - 15),
                     (0, 0, tile_size, tile_size), 1)
    return surf


# ---------------------------------------------------------------------------
# Kamera
# ---------------------------------------------------------------------------

class Camera:
    """
    Einfache Scroll-Kamera.
    Berechnet einen Versatz, sodass der Spieler immer roughly zentriert ist.
    """

    def __init__(self, map_width: int, map_height: int):
        self.offset = pygame.Vector2(0, 0)
        self.map_w  = map_width
        self.map_h  = map_height

    def apply(self, rect: pygame.Rect) -> pygame.Rect:
        return rect.move(self.offset.x, self.offset.y)

    def apply_vec(self, pos: pygame.Vector2) -> pygame.Vector2:
        return pos + self.offset

    def update(self, target: "Player"):
        ox = WIDTH  // 2 - target.rect.centerx
        oy = HEIGHT // 2 - target.rect.centery
        # Karte nicht über die Ränder scrollen
        ox = min(0, ox)
        oy = min(0, oy)
        ox = max(WIDTH  - self.map_w, ox)
        oy = max(HEIGHT - self.map_h, oy)
        self.offset.x = ox
        self.offset.y = oy


# ---------------------------------------------------------------------------
# Kachel-Sprites
# ---------------------------------------------------------------------------

class Wall(pygame.sprite.Sprite):
    def __init__(self, groups, x: int, y: int):
        super().__init__(groups)
        self.image = (
            _try_load("assets/wall.png", (TILESIZE, TILESIZE))
            or _make_wall_surface(TILESIZE)
        )
        self.rect = self.image.get_rect(topleft=(x * TILESIZE, y * TILESIZE))


class Locker(pygame.sprite.Sprite):
    def __init__(self, groups, x: int, y: int):
        super().__init__(groups)
        self.image = (
            _try_load("assets/locker.png", (TILESIZE, TILESIZE))
            or _make_locker_surface(TILESIZE)
        )
        self.rect = self.image.get_rect(topleft=(x * TILESIZE, y * TILESIZE))
        self.tile_x = x
        self.tile_y = y
        # Kollisions-Rect (für Wand-Checks)
        self.hit_rect = self.rect.copy()


class Floor(pygame.sprite.Sprite):
    """Reine Bodenkachel – nur zum Zeichnen, keine Kollision."""

    def __init__(self, groups, x: int, y: int):
        super().__init__(groups)
        dark = (x + y) % 2 == 0
        self.image = _make_floor_surface(TILESIZE, dark)
        self.rect  = self.image.get_rect(topleft=(x * TILESIZE, y * TILESIZE))


# ---------------------------------------------------------------------------
# Spieler
# ---------------------------------------------------------------------------

class Player(pygame.sprite.Sprite):
    """
    Spieler mit flüssiger WASD-Steuerung, weiches Drehen in Laufrichtung,
    Kreiskollision gegen Wände und Schließfacher.
    """

    def __init__(self, groups, obstacles, x: int, y: int):
        super().__init__(groups)

        self._base_surf = (
            _try_load("assets/player.png", (PLAYER_RADIUS * 2, PLAYER_RADIUS * 2))
            or _make_player_surface(PLAYER_RADIUS)
        )

        self.image = self._base_surf.copy()
        self.rect  = self.image.get_rect(center=(x * TILESIZE + TILESIZE // 2,
                                                  y * TILESIZE + TILESIZE // 2))
        # Float-Koordinaten für genaue Bewegung
        self.pos   = pygame.Vector2(self.rect.center)
        self.vel   = pygame.Vector2(0, 0)

        # aktuelle Blickrichtung in Grad (0° = nach oben)
        self.angle = 0.0
        self._target_angle = 0.0

        self.obstacles = obstacles
        self.hidden    = False          # Versteckt in Schließfach?
        self.speed     = PLAYER_SPEED

    # ------------------------------------------------------------------
    def get_keys(self):
        keys = pygame.key.get_pressed()
        self.vel.x = 0
        self.vel.y = 0
        if keys[pygame.K_w] or keys[pygame.K_UP]:    self.vel.y -= 1
        if keys[pygame.K_s] or keys[pygame.K_DOWN]:  self.vel.y += 1
        if keys[pygame.K_a] or keys[pygame.K_LEFT]:  self.vel.x -= 1
        if keys[pygame.K_d] or keys[pygame.K_RIGHT]: self.vel.x += 1
        if self.vel.length_squared() > 0:
            self.vel = self.vel.normalize()

    # ------------------------------------------------------------------
    def _collide_with_obstacles(self, dx: float, dy: float) -> tuple[float, float]:
        """
        Bewegt den Spieler um (dx, dy) und schiebt ihn aus Kollisionen heraus.
        Gibt den tatsächlich ausgeführten Versatz zurück.
        """
        r = PLAYER_RADIUS

        new_x = self.pos.x + dx
        new_y = self.pos.y + dy

        for obs in self.obstacles:
            rect = obs.rect
            # nächster Punkt auf dem Rechteck zu new_pos
            cx = max(rect.left, min(new_x, rect.right))
            cy = max(rect.top,  min(new_y, rect.bottom))
            dist2 = (new_x - cx) ** 2 + (new_y - cy) ** 2
            if dist2 < r * r and dist2 > 0:
                dist = math.sqrt(dist2)
                overlap = r - dist
                nx = (new_x - cx) / dist
                ny = (new_y - cy) / dist
                new_x += nx * overlap
                new_y += ny * overlap

        actual_dx = new_x - self.pos.x
        actual_dy = new_y - self.pos.y
        self.pos.x = new_x
        self.pos.y = new_y
        return actual_dx, actual_dy

    # ------------------------------------------------------------------
    def _rotate_towards(self, target_deg: float, dt: float, speed_deg: float = 540.0):
        """Dreht angle sanft auf target_deg zu (kürzester Weg)."""
        diff = (target_deg - self.angle + 180) % 360 - 180
        step = speed_deg * dt
        if abs(diff) <= step:
            self.angle = target_deg
        else:
            self.angle += math.copysign(step, diff)
        self.angle %= 360

    # ------------------------------------------------------------------
    def update(self, dt: float):
        if self.hidden:
            return

        self.get_keys()

        dx = self.vel.x * self.speed * dt
        dy = self.vel.y * self.speed * dt

        self._collide_with_obstacles(dx, dy)

        # Blickrichtung aktualisieren wenn Spieler sich bewegt
        if self.vel.length_squared() > 0:
            # pygame y-Achse zeigt nach unten; Winkel: 0° = oben
            self._target_angle = math.degrees(math.atan2(self.vel.x, -self.vel.y))

        self._rotate_towards(self._target_angle, dt)

        # Image rotieren (Ursprungsbild zeigt nach oben = 0°)
        self.image = pygame.transform.rotate(self._base_surf, -self.angle)
        self.rect  = self.image.get_rect(center=(int(self.pos.x), int(self.pos.y)))

    # ------------------------------------------------------------------
    def hide(self):
        self.hidden = True
        self.image  = pygame.Surface((1, 1), pygame.SRCALPHA)

    def unhide(self):
        self.hidden = False


# ---------------------------------------------------------------------------
# Sichtkegel-Zeichenfunktion (utility, kein Sprite)
# ---------------------------------------------------------------------------

def draw_fov(surface: pygame.Surface, camera: Camera,
             center: pygame.Vector2, angle_deg: float,
             length: int = FOV_LENGTH, half_fov: int = FOV_ANGLE):
    """
    Zeichnet einen halbtransparenten Sichtkegel für einen Gegner.
    Nutzt eine temporäre SRCALPHA-Surface für das Alpha-Blending.
    """
    # Anzahl der Polygon-Punkte am Bogen
    steps = 20
    fov_surf = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)

    cam_center = camera.apply_vec(center)

    points = [cam_center]
    for i in range(steps + 1):
        t = i / steps
        ray_angle = math.radians(angle_deg - half_fov + t * half_fov * 2)
        # 0° = nach oben → x = sin, y = -cos
        px = cam_center.x + math.sin(ray_angle) * length
        py = cam_center.y - math.cos(ray_angle) * length
        points.append((px, py))

    pygame.draw.polygon(fov_surf, FOV_COLOR, points)
    surface.blit(fov_surf, (0, 0))
