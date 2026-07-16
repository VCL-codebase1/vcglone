import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    serverActions: {
      bodySizeLimit: "12mb"
    }
  }
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true
});
