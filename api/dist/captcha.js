"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCaptcha = void 0;
const axios_1 = __importDefault(require("axios"));
const verifyCaptcha = async (token) => {
    const params = new URLSearchParams({
        secret: process.env.CAPTCHA_SECRET_KEY || '',
        response: token,
    });
    const response = await axios_1.default.post('https://www.google.com/recaptcha/api/siteverify', params);
    return response.data.success;
};
exports.verifyCaptcha = verifyCaptcha;
