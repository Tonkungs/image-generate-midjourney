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
Object.defineProperty(exports, "__esModule", { value: true });
var puppeteer_1 = require("puppeteer");
var FetchPuppeteer = /** @class */ (function () {
    function FetchPuppeteer(again) {
        if (again === void 0) { again = 5; }
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
        this.MaxAgain = 5;
        this.again = 0;
        this.pages = [];
        this.again = again;
    }
    /**
     * Launches a new Puppeteer browser instance and initializes a new page.
     * Sets the user agent for the page to the specified value.
     * If an error occurs during the browser launch, it throws an error with a descriptive message.
     */
    FetchPuppeteer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, i, page, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 8, , 9]);
                        if (this.browser) {
                            throw new Error("Browser is already initialized");
                        }
                        _a = this;
                        return [4 /*yield*/, puppeteer_1.default.launch({
                                headless: true,
                            })];
                    case 1:
                        _a.browser = (_c.sent());
                        _b = this;
                        return [4 /*yield*/, this.browser.newPage()];
                    case 2:
                        _b.page = (_c.sent());
                        return [4 /*yield*/, this.page.setUserAgent(this.userAgent)];
                    case 3:
                        _c.sent();
                        i = 0;
                        _c.label = 4;
                    case 4:
                        if (!(i < 4)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.browser.newPage()];
                    case 5:
                        page = _c.sent();
                        page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
                        this.pages.push(page);
                        _c.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_1 = _c.sent();
                        throw new Error("Error launching browser: " + error_1);
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Downloads an image from a given URL using Puppeteer, and returns the image data as a Buffer.
     * @param imageUrl The URL of the image to download.
     * @returns A promise that resolves with the image data as a Buffer.
     * @throws If there is an error during the image download, it throws an error with a descriptive message.
     */
    FetchPuppeteer.prototype.lunchPuppeteer = function (imageUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        if (!this.page) {
                            throw new Error("page is not initialized");
                        }
                        return [4 /*yield*/, this.page.goto(imageUrl, { waitUntil: 'networkidle0' })];
                    case 1:
                        response = _a.sent();
                        if (response === null) {
                            throw new Error('Failed to get response');
                        }
                        if (!!response.ok()) return [3 /*break*/, 4];
                        if (!(this.again <= this.MaxAgain)) return [3 /*break*/, 3];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 10000); })];
                    case 2:
                        _a.sent();
                        this.again++;
                        return [2 /*return*/, this.lunchPuppeteer(imageUrl)];
                    case 3: throw new Error("HTTP error! Status: ".concat(response.status()));
                    case 4:
                        this.again = 0;
                        return [4 /*yield*/, response.buffer()];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        error_2 = _a.sent();
                        throw new Error("Error downloading the image:" + error_2.message);
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    FetchPuppeteer.prototype.lunchPuppeteerv2 = function (imageUrls) {
        return __awaiter(this, void 0, void 0, function () {
            var buffers, openPagePromises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error('Browser is not launched. Call launchBrowser() first.');
                        }
                        buffers = [];
                        openPagePromises = imageUrls.slice(0, 4).map(function (imageUrl, index) { return __awaiter(_this, void 0, void 0, function () {
                            var response, buffer;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.pages[index].goto(imageUrl, { waitUntil: 'networkidle0' })];
                                    case 1:
                                        response = _a.sent();
                                        if (response === null) {
                                            throw new Error("Failed to get response for ".concat(imageUrl));
                                        }
                                        return [4 /*yield*/, response.buffer()];
                                    case 2:
                                        buffer = _a.sent();
                                        buffers.push(buffer); // Store the buffer
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(openPagePromises)];
                    case 1:
                        _a.sent(); // Wait for all pages to finish
                        return [2 /*return*/, buffers]; // Return the array of image buffers
                }
            });
        });
    };
    /**
     * Closes the Puppeteer browser instance.
     * If the browser is not initialized, it throws an error with a descriptive message.
     * @throws {Error} If the browser is not initialized
     */
    FetchPuppeteer.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) {
                            throw new Error("Browser is not initialized");
                        }
                        return [4 /*yield*/, this.browser.close()];
                    case 1:
                        _a.sent();
                        this.browser = undefined;
                        this.page = undefined;
                        return [2 /*return*/];
                }
            });
        });
    };
    return FetchPuppeteer;
}());
exports.default = FetchPuppeteer;
