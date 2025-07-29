"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewEmail = exports.sendEmail = void 0;
const resend_1 = require("resend");
const email_1 = __importDefault(require("./email"));
const render_1 = require("@react-email/render");
const uuid_1 = require("uuid");
const sendEmail = async (to, apiKey) => {
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
        from: 'noreply@alt-generator.ai',
        to: to,
        subject: 'AI ALT Generator - Your API key',
        html: await (0, render_1.render)((0, email_1.default)({ apiKey })),
    });
};
exports.sendEmail = sendEmail;
const previewEmail = async () => {
    const apiKey = (0, uuid_1.v4)();
    return await (0, render_1.render)((0, email_1.default)({ apiKey }));
};
exports.previewEmail = previewEmail;
