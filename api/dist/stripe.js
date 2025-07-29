"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionById = exports.checkout = exports.meterUsage = exports.getCustomerPortalUrl = exports.getStripeCustomer = exports.stripeWebhook = void 0;
const stripe_1 = __importDefault(require("stripe"));
const basecamp_1 = require("./basecamp");
const stripeWebhook = async (req) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    switch (event.type) {
        case 'customer.subscription.created':
            console.log('subscription created', event.data.object);
            const customer = (await stripe.customers.retrieve(event.data.object.customer));
            const sub = {
                customerId: customer.id,
                customerEmail: customer?.email,
                subscriptionId: event.data.object.id,
                credits: null,
                type: 'subscription',
            };
            return sub;
        case 'checkout.session.completed':
            if (event.data.object.subscription) {
                // this will already be captured in the subscription webhook
                return {
                    type: 'disregard',
                };
            }
            const checkoutSession = (await stripe.checkout.sessions.retrieve(event.data.object.id, {
                expand: ['line_items', 'line_items.data.price.product'],
            }));
            const totalCredits = checkoutSession.line_items?.data.reduce((acc, item) => {
                const product = item.price?.product;
                const credits = product.metadata?.credits
                    ? parseInt(product.metadata.credits)
                    : 0;
                return acc + credits * (item.quantity || 0);
            }, 0) || 1001;
            console.log('checkout completed', checkoutSession, 'credits', totalCredits);
            return {
                customerId: checkoutSession.customer,
                customerEmail: checkoutSession.customer_details?.email,
                subscriptionId: checkoutSession.subscription,
                credits: totalCredits,
                type: 'checkout',
            };
        // ... existing code ..
    }
};
exports.stripeWebhook = stripeWebhook;
const getStripeCustomer = async (customerId) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    return await stripe.customers.retrieve(customerId);
};
exports.getStripeCustomer = getStripeCustomer;
const getCustomerPortalUrl = async (customerId) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
    });
};
exports.getCustomerPortalUrl = getCustomerPortalUrl;
const meterUsage = async (customerId) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    return await stripe.billing.meterEvents.create({
        event_name: 'alt_tag_generation',
        payload: {
            stripe_customer_id: customerId,
            value: '1',
        },
    });
};
exports.meterUsage = meterUsage;
const prices = {
    100: {
        id: 'price_1QtmNPEI3KGp1kCTGjeGvP6G',
        discount: 'DlAEeF1c',
    },
    500: {
        id: 'price_1QtmO9EI3KGp1kCTYKHJBCVn',
        discount: 'uWuEpfLA',
    },
    1000: {
        id: 'price_1QtmOdEI3KGp1kCTD4Esmv8k',
        discount: '30shMcKI',
    },
    payasyougo: {
        id: 'price_1QtmzsEI3KGp1kCTwbaQCZM8',
        discount: 'YDgWpHFW',
    },
};
const checkout = async (priceId = 'payasyougo') => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    await (0, basecamp_1.sendMessageToSlack)(`someone is checking out 👀 - ${priceId}`);
    return await stripe.checkout.sessions.create({
        line_items: [
            {
                price: prices[priceId].id,
                quantity: priceId !== 'payasyougo' ? 1 : undefined,
            },
        ],
        mode: priceId === 'payasyougo' ? 'subscription' : 'payment',
        success_url: 'https://alt-generator.ai/thank-you',
        cancel_url: 'https://alt-generator.ai',
        discounts: [
            {
                coupon: prices[priceId].discount,
            },
        ],
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
    });
};
exports.checkout = checkout;
const getSubscriptionById = async (subscriptionId) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    return await stripe.subscriptions.retrieve(subscriptionId);
};
exports.getSubscriptionById = getSubscriptionById;
