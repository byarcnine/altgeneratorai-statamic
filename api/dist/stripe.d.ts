import Stripe from 'stripe';
export declare const stripeWebhook: (req: any) => Promise<{
    customerId: string;
    customerEmail: string | null;
    subscriptionId: string;
    credits: null;
    type: string;
} | {
    type: string;
    customerId?: undefined;
    customerEmail?: undefined;
    subscriptionId?: undefined;
    credits?: undefined;
} | {
    customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null;
    customerEmail: string | null | undefined;
    subscriptionId: string | Stripe.Subscription | null;
    credits: number;
    type: string;
} | undefined>;
export declare const getStripeCustomer: (customerId: string) => Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>>;
export declare const getCustomerPortalUrl: (customerId: string) => Promise<Stripe.Response<Stripe.BillingPortal.Session>>;
export declare const meterUsage: (customerId: string) => Promise<Stripe.Response<Stripe.Billing.MeterEvent>>;
declare const prices: {
    100: {
        id: string;
        discount: string;
    };
    500: {
        id: string;
        discount: string;
    };
    1000: {
        id: string;
        discount: string;
    };
    payasyougo: {
        id: string;
        discount: string;
    };
};
export type PriceIdKeys = keyof typeof prices;
export declare const checkout: (priceId?: keyof typeof prices) => Promise<Stripe.Response<Stripe.Checkout.Session>>;
export declare const getSubscriptionById: (subscriptionId: string) => Promise<Stripe.Response<Stripe.Subscription>>;
export {};
