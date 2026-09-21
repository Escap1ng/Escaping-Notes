// PNG 编码（8-bit truecolor，无第三方依赖）：逐行自适应滤波（SAD 启发式）。
// 从 scripts/build_seo.mjs 原样搬来——搬完 og.png 必须逐字节不变，
// 校验方式：node scripts/build_seo.mjs --og 后比对 public/og.png 的 sha256。
import { deflateSync } from 'node:zlib'

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'latin1')
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, sum])
}

// 这张图主体是平滑渐变，用预测型滤波（Sub/Up/Paeth）后体积能降一个量级；
// 若一律用 filter 0，1200×630 会接近 700 KB。
export function encodePng(w, h, rgb) {
  const stride = w * 3
  const bpp = 3
  const raw = Buffer.alloc((stride + 1) * h)
  const cand = Buffer.alloc(stride)
  const best = Buffer.alloc(stride)
  let prev = null
  for (let y = 0; y < h; y++) {
    const cur = rgb.subarray(y * stride, (y + 1) * stride)
    let bestType = 0
    let bestSad = Infinity
    let bestBuf = cur
    for (let type = 0; type <= 4; type++) {
      let sad = 0
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? cur[i - bpp] : 0
        const b = prev ? prev[i] : 0
        const c = prev && i >= bpp ? prev[i - bpp] : 0
        let v
        if (type === 0) v = cur[i]
        else if (type === 1) v = cur[i] - a
        else if (type === 2) v = cur[i] - b
        else if (type === 3) v = cur[i] - ((a + b) >> 1)
        else {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          v = cur[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
        }
        v &= 0xff
        cand[i] = v
        sad += v < 128 ? v : 256 - v
      }
      if (sad < bestSad) {
        bestSad = sad
        bestType = type
        best.set(cand)
        if (type !== 0) bestBuf = best
      }
    }
    const off = y * (stride + 1)
    raw[off] = bestType
    bestBuf.copy(raw, off + 1)
    prev = cur
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
