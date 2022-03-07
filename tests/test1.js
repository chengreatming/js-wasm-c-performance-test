const config = require('./config.json')
const { scale, repeatTimes, consoleDetail } = config
const fs = require('fs')
// Load the node module exporting our WebAssembly module
const myModule = require("../index");

const { 
    __pin, 
    __unpin, 
    __newArray,
    __getArray,
    __getArrayView,
    __getInt32Array,
    bilinearInterpolation
     } 
= myModule
const doseData = require("./doseData.json")
const { data, width, height } = doseData
const newWidth = width * scale
const newHeight = height * scale
console.log('======= start test1 wasm =======')
console.log('插值倍数:', scale)
console.log('原图像尺寸:', width, height)
console.log('插值后图像尺寸:', newWidth, newHeight)
console.log('遍历像素点个数:', newWidth * newHeight)
const start = Date.now()
// 重复次数

for(let i = 0; i < repeatTimes; i++) {
    // 将二维doseGrid转成一维
    consoleDetail && console.time('flat')
    const flatData = data.flat()
    consoleDetail && console.timeEnd('flat')

    // 构建输入数组指针, 与webassembly共享内存
    const srcPtr = __pin(__newArray(myModule.Int32Array_ID, flatData))

    // 插值
    consoleDetail && console.time('插值')
    const outputPtr = bilinearInterpolation(srcPtr, width, height, newWidth, newHeight)
    consoleDetail && console.timeEnd('插值')

    // 释放输入数组指针，这样才能被垃圾回收，释放内存
    __unpin(srcPtr)

    // 读取插值后的结果，webassembly只输出内存指针，所以这里需要根据指针地址copy出一个新数组
    consoleDetail && console.time('读取结果')
    // const output = __getArray(outputPtr)
    const output = __getArrayView(outputPtr)
    
    consoleDetail && console.timeEnd('读取结果')

    // 将一维数组转成二维，略为耗时
    consoleDetail && console.time('将一维数组转成二维') 
    const res = flatArray2TwoDimensionalArray(output, newWidth, newHeight )
    consoleDetail && console.timeEnd('将一维数组转成二维')
    
    // 将结果写入文件
    // consoleDetail && fs.writeFileSync("./tests/newDose.json", JSON.stringify(res))
}

function flatArray2TwoDimensionalArray(arr, cols, rows,) {
    const res = []
    for(let i = 0; i < rows; i++) {
        res.push(arr.slice(i * cols, (i + 1) * cols))
    }
    return res
}

const end = Date.now()
const totalTime = end - start
const averageTime = totalTime / repeatTimes


console.log('重复插值', repeatTimes, '次,总时间: ', totalTime, 'ms, 平均时间: ', averageTime, 'ms')
console.log('=======end test1=======')