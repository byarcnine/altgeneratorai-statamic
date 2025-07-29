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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ff = __importStar(require("@google-cloud/functions-framework"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const vertexai_1 = require("@google-cloud/vertexai");
const uuid_1 = require("uuid");
const stripe_1 = require("./stripe");
const mailer_1 = require("./mailer");
const dotenv_1 = __importDefault(require("dotenv"));
const captcha_1 = require("./captcha");
const basecamp_1 = require("./basecamp");
dotenv_1.default.config();
firebase_admin_1.default.initializeApp({
    projectId: 'ai-image-alt',
    storageBucket: 'ai-image-alt.firebasestorage.app',
});
const firestore = firebase_admin_1.default.firestore();
firestore.settings({ databaseId: 'apiusage' });
const vertex_ai = new vertexai_1.VertexAI({
    project: 'ai-image-alt',
    location: 'europe-west4',
});
const model = 'gemini-2.0-flash';
const FREE_TRAIL_CREDITS = 20;
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generationConfig: {
        maxOutputTokens: 512,
        temperature: 1,
        topP: 0.95,
    },
    // safetySettings: [
    //   {
    //     category: 'HARM_CATEGORY_HATE_SPEECH',
    //     threshold: 'OFF',
    //   },
    //   {
    //     category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    //     threshold: 'OFF',
    //   },
    //   {
    //     category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    //     threshold: 'OFF',
    //   },
    //   {
    //     category: 'HARM_CATEGORY_HARASSMENT',
    //     threshold: 'OFF',
    //   },
    // ],
});
// Initialize express
const app = (0, express_1.default)();
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    },
}));
// Register a single HTTP function to handle multiple endpoints
app.post('/generate', async (req, res) => {
    const path = req.path;
    // ------------------------------------------------------------
    // Handle the 'generate' endpoint
    // ------------------------------------------------------------
    const ACCESS_TOKEN = req.headers['x-access-token'];
    if (!ACCESS_TOKEN) {
        res.status(401).send('Unauthorized - no x-access-token provided in header');
        return;
    }
    const { url, language, assetId, prompt, existingAltText, filename } = req.body;
    const usageRef = firestore.collection('api-usage').doc(ACCESS_TOKEN);
    const doc = await usageRef.get();
    const usage = doc.data();
    if (!usage) {
        console.error('Usage not found');
        res.status(400).send('Usage not found');
        return;
    }
    const isValidImageDomain = usage.domains.some((domain) => url.includes(domain));
    if (!isValidImageDomain) {
        console.error('Invalid image domain');
        res.status(400).send('Invalid image domain');
        return;
    }
    if (usage.subscription) {
        const subscription = (await usage.subscription.get()).data();
        if (!subscription) {
            console.error('Subscription not found');
            res.status(400).send('Subscription not found');
            return;
        }
        const stripeSubscription = await (0, stripe_1.getSubscriptionById)(subscription.subscriptionId);
        if (!stripeSubscription) {
            console.error('Subscription not found');
            res.status(400).send('Subscription not found');
            return;
        }
        if (stripeSubscription.status !== 'active') {
            console.error('Subscription not active');
            res.status(400).send('Subscription not active');
            return;
        }
    }
    // TODO: Thats just a fallback for now. Remove later
    // Just to be sure
    if (usage.count && usage.count >= 10000) {
        console.error('Usage limit reached');
        res.status(400).send('Usage limit reached');
        return;
    }
    if (usage.type === 'checkout' && usage.credits && usage.credits <= 0) {
        console.error('No credits left');
        res.status(400).send('No credits left');
        return;
    }
    if (!req.body || !req.body.url || !req.body.language || !req.body.assetId) {
        console.error('Missing URL, assetId or language in request body');
        res.status(400).send('Missing URL, assetId or language in request body');
        return;
    }
    const imageResponse = await axios_1.default.get(url, { responseType: 'arraybuffer' });
    if (imageResponse.status !== 200) {
        console.error('Failed to fetch the image from the provided URL.');
        res.status(400).send('Failed to fetch the image from the provided URL.');
    }
    // Add MIME type validation
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const contentType = imageResponse.headers['content-type'];
    if (!supportedTypes.includes(contentType)) {
        res
            .status(400)
            .send(`Unsupported image type: ${contentType}. Supported types are: ${supportedTypes.join(', ')}`);
        console.error(`Unsupported image type: ${contentType}. Supported types are: ${supportedTypes.join(', ')}`);
        return;
    }
    const imageBuffer = Buffer.from(imageResponse.data);
    // Resize the image using sharp
    const resizedImageBuffer = await (0, sharp_1.default)(imageBuffer)
        .resize(800, 800, { fit: 'inside' })
        .toBuffer();
    // Ensure language is an array
    const languages = usage.languageOverwrite
        ? [usage.languageOverwrite]
        : Array.isArray(language)
            ? language
            : [language];
    // Convert buffer to Uint8Array for Gemini
    const imageData = new Uint8Array(resizedImageBuffer);
    // Generate content using Gemini for each language
    const customPrompt = prompt || usage.defaultPrompt || '';
    const fileNameInstructions = filename
        ? `The filename of the image is: ${filename}. Inspect the filename, it might contain important information about the image. Never mention the filename in the alt text.`
        : '';
    const altTexts = await Promise.all(languages.map(async (lang) => {
        const result = await generativeModel.generateContent({
            systemInstruction: `
        ** GENERAL INSTRUCTIONS **
            Create a STRICTLY brief alt text description for this image.
            The description MUST be 120 characters or less - longer responses will be truncated.
            Focus on essential visual information and context. If there is text in the image, include it in the alt text.
            Only respond with the ALT text, nothing else.
            Give your answer in the language "${lang}" - every word in the alt text should be in the language "${lang}".
            Never mention the language in the alt text.
            Use the information provided in the prompt to create the alt text, especially names, locations and other specific information.
        ** SPECIFIC INSTRUCTIONS **
            ${customPrompt}
        `,
            contents: [
                {
                    role: 'user',
                    parts: [
                        existingAltText
                            ? {
                                text: `The existing alt text is: ${existingAltText}. Use this as a reference to create a new alt text. ${fileNameInstructions}`,
                            }
                            : {
                                text: 'This is the image to create the alt text for:',
                            },
                        {
                            inlineData: {
                                mimeType: 'image/png',
                                data: Buffer.from(imageData).toString('base64'),
                            },
                        },
                    ],
                },
            ],
        });
        const response = await result.response;
        return (response.candidates?.[0]?.content?.parts?.[0]?.text ||
            `No description generated for language: ${lang}.`);
    }));
    await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(usageRef);
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
        const existingData = doc.exists ? doc.data() : undefined;
        const monthlyUsage = existingData?.monthlyUsage || {};
        // Increment the monthly count
        monthlyUsage[currentMonth] = (monthlyUsage[currentMonth] || 0) + 1;
        transaction.set(usageRef, {
            count: (existingData?.count || 0) + 1,
            monthlyUsage,
            lastUsed: currentDate,
            updatedAt: currentDate,
        }, { merge: true });
    });
    // If the user has a subscription and has used more than the free trial credits, meter usage
    if (usage?.subscription &&
        usage.type === 'subscription' &&
        usage.count &&
        usage.count > FREE_TRAIL_CREDITS) {
        const subscription = (await usage.subscription.get()).data();
        if (subscription?.customerId) {
            await (0, stripe_1.meterUsage)(subscription.customerId);
        }
    }
    if (usage.type === 'checkout' && usage.credits) {
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(usageRef);
            const currentUsage = doc.data();
            if (currentUsage.credits && currentUsage.credits > 0) {
                transaction.set(usageRef, {
                    ...currentUsage,
                    credits: currentUsage.credits - 1,
                }, { merge: true });
            }
        });
    }
    // Include current month's usage in response
    const currentMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
    const monthlyCount = (usage.monthlyUsage?.[currentMonth] || 0) + 1;
    res.send({
        alt: altTexts,
        assetId,
        accountUsage: (usage.count || 0) + 1,
        monthlyUsage: monthlyCount,
    });
});
app.get('/getUsage', async (req, res) => {
    // ------------------------------------------------------------
    // Handle the 'getUsage' endpoint
    // ------------------------------------------------------------
    const ACCESS_TOKEN = req.headers['x-access-token'];
    if (!ACCESS_TOKEN) {
        res.status(401).send('Unauthorized - no x-access-token provided in header');
        return;
    }
    const usageRef = firestore.collection('api-usage').doc(ACCESS_TOKEN);
    const doc = await usageRef.get();
    const usage = doc.data();
    if (!usage) {
        res.status(404).send('Usage not found');
        return;
    }
    res.send({
        accountUsage: usage.count || 0,
        monthlyUsage: usage.monthlyUsage || {},
        lastUsed: usage.lastUsed || null,
        updatedAt: usage.updatedAt || null,
        type: usage.type,
        credits: usage.credits,
    });
});
app.post('/stripe', async (req, res) => {
    const wh = await (0, stripe_1.stripeWebhook)(req);
    const apiKey = (0, uuid_1.v4)();
    if (!wh) {
        res.status(400).send('webhook error');
        return;
    }
    if (wh.type === 'disregard') {
        res.send({ success: true });
        return;
    }
    if (wh.type === 'subscription') {
        if (!wh.customerEmail) {
            res.status(400).send('customer email error');
            return;
        }
        await firestore
            .collection('api-usage')
            .doc(apiKey)
            .set({
            domains: ['http'],
            createdAt: new Date(),
            type: 'subscription',
            customerId: wh.customerId,
            subscription: firestore
                .collection('stripe-subscriptions')
                .doc(wh.subscriptionId),
        });
        await firestore
            .collection('stripe-subscriptions')
            .doc(wh.subscriptionId)
            .set(wh, { merge: true });
        await (0, mailer_1.sendEmail)(wh.customerEmail, apiKey);
    }
    if (wh.type === 'checkout') {
        const apiKey = (0, uuid_1.v4)();
        await firestore
            .collection('api-usage')
            .doc(apiKey)
            .set({
            domains: ['http'],
            createdAt: new Date(),
            credits: wh.credits + FREE_TRAIL_CREDITS,
            type: 'checkout',
            customerId: wh.customerId,
        });
        await (0, mailer_1.sendEmail)(wh.customerEmail, apiKey);
    }
    await (0, basecamp_1.sendMessageToSlack)(`NEW Customer 🚀 - ${wh.customerEmail}`);
    res.send({ success: true });
});
app.get('/customer-portal', async (req, res) => {
    const ACCESS_TOKEN = req.headers['x-access-token'];
    if (!ACCESS_TOKEN) {
        res.status(401).send('Unauthorized - no x-access-token provided in header');
        return;
    }
    const licenseRef = firestore.collection('api-usage').doc(ACCESS_TOKEN);
    const doc = await licenseRef.get();
    if (!doc.exists) {
        res.status(404).send('License not found');
        return;
    }
    const data = doc.data();
    const customerId = data.customerId;
    if (!customerId) {
        res.status(400).send('Customer ID not found');
        return;
    }
    const portalUrl = await (0, stripe_1.getCustomerPortalUrl)(customerId);
    res.send({ url: portalUrl.url });
});
app.get('/preview-email', async (req, res) => {
    const email = await (0, mailer_1.previewEmail)();
    res.send(email);
});
app.get('/checkout', async (req, res) => {
    const priceId = req.query.product;
    const checkoutSession = await (0, stripe_1.checkout)(priceId);
    if (!checkoutSession.url) {
        res.status(400).send('Checkout session error');
        return;
    }
    res.redirect(checkoutSession.url);
});
const whitelist = [
    'https://project-giy0q50vqgyva3okvn5o.framercanvas.com',
    'https://alt-generator.ai',
];
app.options('/preview', (req, res) => {
    const originDomain = req.headers['origin'];
    if (process.env.NODE_ENV === 'development' ||
        whitelist.includes(originDomain)) {
        res.setHeader('Access-Control-Allow-Origin', originDomain);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.status(204).send();
});
app.post('/preview', async (req, res) => {
    const { token, lang = 'en', base64Image, fileName = '' } = req.body;
    const ipAddress = req.headers['x-forwarded-for'];
    const originDomain = req.headers['origin'];
    const isDev = process.env.NODE_ENV === 'development' || whitelist.includes(originDomain);
    if (isDev) {
        res.setHeader('Access-Control-Allow-Origin', originDomain);
    }
    const isValid = await (0, captcha_1.verifyCaptcha)(token);
    if (!isValid && !isDev) {
        res.status(400).send('Invalid captcha');
        return;
    }
    const doc = await firestore.collection('preview-ips').doc(ipAddress).get();
    if (doc.exists) {
        const data = doc.data();
        const lastUsedTime = new Date(data?.lastUsed?.seconds * 1000); // Convert Firestore timestamp to Date
        const hoursSinceLastUse = (Date.now() - lastUsedTime.getTime()) / (1000 * 60 * 60);
        if (data.count > 50 && hoursSinceLastUse < 1) {
            res.status(400).send('Too many requests. Please try again later.');
            return;
        }
        // Reset count if more than an hour has passed, otherwise increment
        const newCount = hoursSinceLastUse >= 1 ? 1 : data.count + 1;
        await firestore
            .collection('preview-ips')
            .doc(ipAddress)
            .set({ count: newCount, lastUsed: new Date() });
    }
    else {
        await firestore
            .collection('preview-ips')
            .doc(ipAddress)
            .set({ count: 1, lastUsed: new Date() });
    }
    if (!base64Image) {
        res.status(400).send('No image provided');
        return;
    }
    // 10MB limit
    if (base64Image.length > 1024 * 1024 * 10) {
        res.status(400).send('Image too large');
        return;
    }
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];
    const result = await generativeModel.generateContent({
        systemInstruction: `
        ** GENERAL INSTRUCTIONS **
            Create a STRICTLY brief alt text description for this image.
            The description MUST be 120 characters or less - longer responses will be truncated.
            Focus on essential visual information and context. If there is text in the image, include it in the alt text.
            Only respond with the ALT text, nothing else.
            Give your answer in the language "${lang}" - every word in the alt text should be in the language "${lang}".
            Use the information provided in the prompt to create the alt text, especially names, locations and other specific information.
        `,
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: `The image is called ${fileName}. This is the image to create the alt text for:`,
                    },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image.split(',')[1],
                        },
                    },
                ],
            },
        ],
    });
    const response = await result.response;
    const alt = response.candidates?.[0]?.content?.parts?.[0]?.text;
    // Upload the base64 image to firebase and create a public URL
    const storage = firebase_admin_1.default.storage();
    const bucket = storage.bucket();
    const file = bucket.file(`images/${(0, uuid_1.v4)()}`);
    const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
    await file.save(buffer, {
        metadata: {
            contentType: mimeType,
        },
    });
    const publicUrl = await file.getSignedUrl({
        action: 'read',
        expires: '03-02-2500',
    });
    await (0, basecamp_1.sendMessageToSlack)(`NEW preview: ${alt} - ${publicUrl}`);
    res.send({ alt });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
// Register the express app with Cloud Functions
ff.http('api', app);
