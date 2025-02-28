"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var worker_threads_1 = require("worker_threads");
// import fetch from "node-fetch";
// import axios from "axios"; // ใช้ axios แทน node-fetch
var fs = require("fs");
var path = require("path");
var playwright_1 = require("playwright"); // ใช้ playwright chromium
if (!worker_threads_1.parentPort) {
    throw new Error("Worker must be run as a worker thread");
}
var seedID = worker_threads_1.workerData;
function download(n) {
    return __awaiter(this, void 0, void 0, function () {
        var urls, filePaths, browser, pages, i, page, buffers_1, openPagePromises, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    urls = Array.from({ length: 4 }, function (_, i) {
                        return "https://cdn.midjourney.com/".concat(n, "/0_").concat(i, ".jpeg");
                    });
                    filePaths = urls.map(function (_, i) {
                        return path.join("01-09", "".concat(1, "_").concat(n, "_0_").concat(i, ".jpg"));
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, playwright_1.chromium.launch({
                            headless: true
                        })];
                case 2:
                    browser = _a.sent();
                    pages = [];
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < 4)) return [3 /*break*/, 7];
                    return [4 /*yield*/, browser.newPage()];
                case 4:
                    page = _a.sent();
                    return [4 /*yield*/, page.setExtraHTTPHeaders({
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
                        })];
                case 5:
                    _a.sent();
                    pages.push(page);
                    _a.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 3];
                case 7:
                    buffers_1 = [];
                    openPagePromises = pages.slice(0, 4).map(function (page, i) { return __awaiter(_this, void 0, void 0, function () {
                        var response, buffer;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, page.goto(urls[i], {
                                        waitUntil: 'networkidle', // รอให้โหลดหน้าเว็บเสร็จ
                                    })];
                                case 1:
                                    response = _a.sent();
                                    // ตรวจสอบว่าโหลดสำเร็จหรือไม่
                                    if (!(response === null || response === void 0 ? void 0 : response.ok())) {
                                        throw new Error("Failed to download image from ".concat(urls[i], ": ").concat(response === null || response === void 0 ? void 0 : response.statusText()));
                                    }
                                    return [4 /*yield*/, response.body()];
                                case 2:
                                    buffer = _a.sent();
                                    buffers_1.push(buffer);
                                    // บันทึก Buffer ลงไฟล์
                                    fs.writeFileSync(filePaths[i], buffer);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(openPagePromises)];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, browser.close()];
                case 9:
                    _a.sent();
                    return [2 /*return*/, __spreadArray([], filePaths, true)]; // คืน path ของไฟล์ที่ดาวน์โหลดเสร็จ
                case 10:
                    error_1 = _a.sent();
                    if (error_1 instanceof Error) {
                        throw new Error("Failed to download image from : ".concat(error_1.message));
                    }
                    else {
                        throw new Error("Failed to download image from unknown error : ".concat(error_1));
                    }
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// const result = download(seedID);
// // ส่งผลลัพธ์กลับไปยัง Main Thread
// parentPort.postMessage(result);
// ใช้ Promise ในการจัดการงาน
download(seedID)
    .then(function (result) {
    // ส่งผลลัพธ์กลับไปยัง Main Thread
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({ status: "success", result: result });
})
    .catch(function (error) {
    // ส่งข้อผิดพลาดกลับไปยัง Main Thread
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({ status: "error", error: error.message });
});
