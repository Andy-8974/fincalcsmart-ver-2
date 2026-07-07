export const C = {
  navy:     [13,  27,  42 ] as [number, number, number],
  teal:     [29,  181, 132] as [number, number, number],
  amber:    [245, 158, 11 ] as [number, number, number],
  red:      [239, 68,  68 ] as [number, number, number],
  slate:    [100, 116, 139] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  softGray: [241, 245, 249] as [number, number, number],
  border:   [226, 232, 240] as [number, number, number],
  textPri:  [13,  27,  42 ] as [number, number, number],
  textSec:  [71,  85,  105] as [number, number, number],
  textMut:  [148, 163, 184] as [number, number, number],
  amberBg:  [255, 251, 235] as [number, number, number],
  amberText:[92,  70,  20 ] as [number, number, number],
};

// US Letter page — margins sized to stay safe when printed on A4
export const P = {
  W:       215.9,
  H:       279.4,
  MH:      19,          // left/right margin (inner = 177.9mm — within A4's 210mm at same margins)
  MV:      18,
  IW:      177.9,       // 215.9 - 19*2
  footerY: 267,
  safeY:   257,         // footerY - 10 — no content may be drawn below this line
};

export const F = 'helvetica';

// Point → mm line height
export const lh = (pt: number, factor = 1.38) => pt * 0.352778 * factor;
