"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToSlack = void 0;
const axios_1 = __importDefault(require("axios"));
const sendMessageToSlack = async (message) => {
    if (process.env.NODE_ENV === 'development') {
        return console.log('Slack message:', message);
    }
    // Slack webhook URL should be set in environment variables
    const slackWebhookUrl = `https://hooks.slack.com/services/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`;
    if (!slackWebhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL environment variable is not set');
    }
    const response = await axios_1.default.post(slackWebhookUrl, {
        text: message,
    }, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response;
};
exports.sendMessageToSlack = sendMessageToSlack;
