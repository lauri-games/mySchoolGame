# --- Fensterkonfiguration ---
TITLE = "Schulalltag: Überlebe die Pause"
WIDTH = 960
HEIGHT = 720
FPS = 60

# --- Kachelgröße ---
TILESIZE = 48
GRIDWIDTH = WIDTH // TILESIZE
GRIDHEIGHT = HEIGHT // TILESIZE

# --- Farben (RGB) ---
WHITE   = (255, 255, 255)
BLACK   = (0,   0,   0)
RED     = (220,  50,  50)
GREEN   = (50,  200,  80)
BLUE    = (50,  100, 220)
YELLOW  = (240, 200,  30)
ORANGE  = (230, 130,  30)
GREY    = (120, 120, 120)
DARKGREY= ( 60,  60,  60)
LIGHTGREY=(190, 190, 190)
BROWN   = (139, 100,  60)
CREAM   = (245, 235, 210)

# Boden- und Wandfarben (prozedural)
COLOR_FLOOR        = (210, 195, 170)   # helles Linoleum
COLOR_FLOOR_DARK   = (185, 172, 150)   # dunklere Kacheln (Schachbrett)
COLOR_WALL         = ( 90,  90, 110)   # Betonwand
COLOR_WALL_TOP     = (110, 110, 135)   # Wandoberkante (Highlight)
COLOR_LOCKER       = ( 70, 110, 160)   # Schließfach (blau)
COLOR_LOCKER_DOOR  = ( 55,  90, 135)

# --- Spieler ---
PLAYER_SPEED   = 220          # Pixel pro Sekunde
PLAYER_RADIUS  = 14           # Kollisionsradius (Pixel)
PLAYER_COLOR   = ( 50, 180, 230)
PLAYER_OUTLINE = ( 20,  90, 140)

# --- Gegner ---
ENEMY_SPEED        = 110       # Pixel pro Sekunde (Patrouille)
ENEMY_CHASE_SPEED  = 180       # Pixel pro Sekunde (Verfolgung)
ENEMY_RADIUS       = 14
ENEMY_COLOR_IDLE   = (220,  80,  80)
ENEMY_COLOR_ALERT  = (255, 200,   0)
ENEMY_COLOR_CHASE  = (255,  30,  30)

# Sichtkegel
FOV_LENGTH  = 200              # Länge des Sichtkegels in Pixel
FOV_ANGLE   = 70               # halber Öffnungswinkel in Grad
FOV_COLOR   = (255, 240, 100, 70)   # RGBA – halbtransparent

# --- Karten-Symbole (Textlevel) ---
# '1' = Wand, '.' = Boden, 'L' = Schließfach,
# 'P' = Startposition Spieler, 'E' = Startposition Gegner
TILE_EMPTY  = '.'
TILE_WALL   = '1'
TILE_LOCKER = 'L'
TILE_PLAYER = 'P'
TILE_ENEMY  = 'E'

# --- Level-Map (erste Karte) ---
# 20 × 15 Kacheln  → 960 × 720 px bei TILESIZE = 48
LEVEL_MAP = [
    "11111111111111111111",
    "1.........1.......11",
    "1...P.....1...E...11",
    "1.........1.......11",
    "1.....111111......11",
    "1.....1....1......11",
    "11.111.....1...LL.11",
    "11.1.......1......11",
    "11.1...E...111111111",
    "11.1...............1",
    "11.111.....1.......1",
    "1..LL......1...E...1",
    "1..........1.......1",
    "1..........1.......1",
    "11111111111111111111",
]
