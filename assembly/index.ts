import * as console from "./myConsole";
export const Int32Array_ID = idof<Int32Array>();
export const Int32Array_ID2 = idof<Int32Array>();
export function bilinearInterpolation(data: Int32Array, width: f64, height: f64, newWidth: f64, newHeight: f64): Int32Array {
  // 计算压缩后的缩放比
  if (width === newWidth && height === newHeight) return data;
  const scaleW = newWidth / width;
  const scaleH = newHeight / height;
  const size = newWidth * newHeight as i32
  const newData:Int32Array = new Int32Array(size);

  let idx: i32 = 0
  for (let row:i32 = 0; row < newHeight; row++ ) {
    for (let col:i32 = 0; col < newWidth; col++) {
      const point = filter(data, width, height, scaleW, scaleH, col, row);
      newData[idx++] = point as i32
    }
  }
  return newData;
}

function filter(data:Int32Array, width:f64, height:f64, scaleW:f64, scaleH:f64, dstCol:f64, dstRow:f64): f64 {
  // 源图像中的坐标（可能是一个浮点）
  const srcCol = Math.min(width - 1, dstCol / scaleW);
  const srcRow = Math.min(height - 1, dstRow / scaleH);
  const intCol = Math.floor(srcCol);
  const intRow = Math.floor(srcRow);
  // 计算u和v
  const u = srcCol - intCol;
  const v = srcRow - intRow;
  // 1-u与1-v
  const u1 = 1 - u;
  const v1 = 1 - v;

  const rgba00 = getValue(data, width, height, intRow + 0, intCol + 0);
  const rgba01 = getValue(data, width, height, intRow + 0, intCol + 1);
  const rgba10 = getValue(data, width, height, intRow + 1, intCol + 0);
  const rgba11 = getValue(data, width, height, intRow + 1, intCol + 1);
  const partV = v * (u1 * rgba10 + u * rgba11);
  const partV1 = v1 * (u1 * rgba00 + u * rgba01);
  return partV + partV1;
}

// The entry file of your WebAssembly module.
function getValue(doseGrid: Int32Array, srcWidth: f64, srcHeight: f64, row: f64, col: f64):f64 {
  const newRow = Math.max(Math.min(srcHeight - 1, row), 0)
  const newCol = Math.max(Math.min(srcWidth - 1, col), 0)
  
  const idx = newRow * srcWidth + newCol
  return doseGrid[idx as i32];
}


class Vec2 {
  constructor(x:i32, y:i32) {
    this.x = x
    this.y = y
  }
  x: i32
  y: i32
}

class Mask {
  constructor(data: Int32Array, width:i32, height: i32, offset:Vec2) {
    this.data = data
    this.width = width
    this.height = height
    this.offset = offset
  }

  data:Int32Array
  width:i32
  height:i32
  offset:Vec2
}


export function traceContours(data: Int32Array, width:i32, minX:i32, maxX:i32, minY:i32,maxY:i32, threshold: i32 = 1):Int32Array {
  let m:Mask = prepareMask(data, width, minX, maxX, minY,maxY, threshold);
  let contours:Int32Array = new Int32Array(m.width *  m.height),
    idx:i32 = 0,
    label = 0,
    w = m.width,
    w2 = w * 2,
    h = m.height,
    src = m.data,
    dx = m.offset.x,
    dy = m.offset.y,
    dest = m.data, // label matrix
    // all [dx,dy] pairs (array index is the direction)
    // 5 6 7
    // 4 X 0
    // 3 2 1
    directions = [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ];
  for (let y:i32 = 1; y < h - 1; y++)
    for (let x:i32 = 1; x < w - 1; x++) {
      let k = y * w + x;
      if (src[k] === 1) {
        for (let i:i32 = -w; i < w2; i += w2) {
          // k - w: outer tracing (y - 1), k + w: inner tracing (y + 1)
          if (src[k + i] === 0 && dest[k + i] === 0) {
            // need contour tracing
            let inner:bool = i === w; // is inner contour tracing ?
            label++; // label for the next contour
            let dir:i32 = inner ? 2 : 6; // start direction
            let current:Vec2 = new Vec2(x, y);
            let previous = current
            let first = current
            let second = new Vec2(0, 0);
            let isNextExist:bool = false
            let isSecondExist:bool = false
            let next:Vec2 = current
            while (true) {
              dest[current.y * w + current.x] = label; // mark label for the current point
              // bypass all the neighbors around the current point in a clockwise
              for (let j:i32 = 0; j < 8; j++) {
                dir = (dir + 1) % 8;

                // get the next point by new direction
                let d = directions[dir]; // index as direction
                next = new Vec2(current.x + d[0], current.y + d[1])
                isNextExist = true
                let k1 = next.y * w + next.x;
                if (src[k1] === 1) {
                  // black boundary pixel
                  dest[k1] = label; // mark a label
                  break;
                }
                dest[k1] = -1; // mark a white boundary pixel
                isNextExist = false
                // next = null;
              }
              if (!isNextExist) break; // no neighbours (one-point contour)
              
              current = next;
              if (isSecondExist) {
                if (
                  previous.x === first.x &&
                  previous.y === first.y &&
                  current.x === second.x &&
                  current.y === second.y
                ) {
                  break; // creating the contour completed when returned to original position
                }
              } else {
                second = next;
              }
              contours[idx++] = previous.x + dx
              contours[idx++] = previous.y + dy
              // c.push({ x: previous.x + dx, y: previous.y + dy });
              previous = current;
              dir = (dir + 4) % 8; // next dir (symmetrically to the current direction)
            }
            if (isNextExist) {
              contours[idx++] = first.x + dx
              contours[idx++] = first.y + dy
              // c.push({ x: first.x + dx, y: first.y + dy }); // close the contour
              contours[idx++] = 666666
              contours[idx++] = 666666
            }
          }
        }
      }
    }
  return contours;
}

function prepareMask(data: Int32Array,width:i32, minX:i32, maxX:i32, minY:i32,maxY:i32, threshold: i32 = 1) : Mask{
  var x:i32,
    y:i32,
    w = width,
    rw = maxX - minX + 3, // bounds size +1 px on each side (a "white" border)
    rh = maxY - minY + 3,
    result = new Int32Array(rw * rh); // reduced mask (bounds size)

  // walk through inner values and copy only "black" points to the result mask
  for (y = minY; y < maxY + 1; y++) {
    for (x = minX; x < maxX + 1; x++) {
      if (data[y * w + x] >= threshold)
        result[(y - minY + 1) * rw + (x - minX + 1)] = 1;
    }
  }

  const offset: Vec2 = new Vec2(minX - 1, minY - 1)
  const mask: Mask = new Mask(result, rw, rh, offset)
  
  return  mask
}
