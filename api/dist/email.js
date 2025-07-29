"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const components_1 = require("@react-email/components");
const React = __importStar(require("react"));
const ConfirmationEmail = ({ apiKey }) => (React.createElement(components_1.Html, null,
    React.createElement(components_1.Head, null),
    React.createElement(components_1.Preview, null, "Your API Key"),
    React.createElement(components_1.Body, { style: main },
        React.createElement(components_1.Container, { style: container },
            React.createElement(components_1.Heading, { style: h1 }, "Your API Key"),
            React.createElement(components_1.Section, { style: codeBox },
                React.createElement(components_1.Text, { style: confirmationCodeText }, apiKey)),
            React.createElement(components_1.Text, { style: heroText },
                "To get started download our",
                ' ',
                React.createElement("a", { href: "https://wordpress.org/plugins/ai-alt-generator/" }, "WordPress plugin"),
                ", add your API key and start generating high quality alt tags."),
            React.createElement(components_1.Text, { style: text }, "If you didn't request this email, there's nothing to worry about, you can safely ignore it.")))));
exports.default = ConfirmationEmail;
const main = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};
const container = {
    margin: '0 auto',
    padding: '0px 20px',
};
const h1 = {
    color: '#1d1c1d',
    fontSize: '36px',
    fontWeight: '700',
    margin: '30px 0',
    padding: '0',
    lineHeight: '42px',
};
const heroText = {
    fontSize: '20px',
    lineHeight: '28px',
    marginBottom: '30px',
};
const codeBox = {
    background: 'rgb(245, 244, 245)',
    borderRadius: '4px',
    marginBottom: '30px',
    padding: '40px 10px',
};
const confirmationCodeText = {
    fontSize: '16px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontFamily: 'monospace',
};
const text = {
    color: '#000',
    fontSize: '14px',
    lineHeight: '24px',
};
