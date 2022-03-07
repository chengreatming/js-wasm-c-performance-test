const config = require('./config.json')
const { scale, repeatTimes, consoleDetail } = config

function getValue(doseGrid, srcWidth, srcHeight, row, col) {
    let newRow = row;
    let newCol = col;
    if (newRow >= srcHeight) {
      newRow = srcHeight - 1;
    } else if (newRow < 0) {
      newRow = 0;
    }
  
    if (newCol >= srcWidth) {
      newCol = srcWidth - 1;
    } else if (newCol < 0) {
      newCol = 0;
    }
  
    return doseGrid[newRow][newCol];
}
  
function bilinearInterpolation(data, width, height, newWidth, newHeight) {
// 计算压缩后的缩放比
if (width === newWidth && height === newHeight) return data;
const scaleW = newWidth / width;
const scaleH = newHeight / height;
const dstData = [];
for (let col = 0; col < newWidth; col += 1) {
    for (let row = 0; row < newHeight; row += 1) {
    if (!dstData[row]) dstData[row] = [];
    const point = filter(data, width, height, scaleW, scaleH, col, row);
    dstData[row][col] = point;
    }
}
return dstData;
}

function filter(data, width, height, scaleW, scaleH, dstCol, dstRow) {
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


const doseData = require("./doseData.json")
const { data, width, height } = doseData
const newWidth = width * scale
const newHeight = height * scale
console.log('======= start test2 Javascript =======')
console.log('插值倍数:', scale)
console.log('原图像尺寸:', width, height)
console.log('插值后图像尺寸:', newWidth, newHeight)
console.log('遍历像素点个数:', newWidth * newHeight)
const start = Date.now()

for(let i = 0; i < repeatTimes; i++) {
    bilinearInterpolation(data, width, height, newWidth, newHeight)
}

const end = Date.now()
const totalTime = end - start
const averageTime = totalTime / repeatTimes

console.log('重复插值', repeatTimes, '次,总时间: ', totalTime, 'ms, 平均时间: ', averageTime, 'ms')

console.log('=======end test2=======')
