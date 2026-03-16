# Client Edit Guide

This guide explains what to change for each new client project.

## 1) Main Content (Single File)

Edit:

- `src/content/site.json`

Focus on:

- `brand`
- `seo.siteUrl` and `seo.pages`
- `hero`, `services`, `process`, `testimonials`, `faq`
- `contact.channels`
- `contact.whatsapp.number`
- `contact.whatsapp.messageTemplate`
- `contact.form.fields`

## 2) Theme Customization

Edit:

- `src/assets/css/tokens.css`

You can safely update:

- colors (`--color-*`)
- fonts (`--font-*`)
- spacing and radius tokens

## 3) Media and Brand Assets

Replace files in:

- `src/assets/images/`
- `src/assets/icons/`

## 4) Build and Preview

Run:

1. `npm run validate`
2. `npm run build:full`

Then review generated files in `dist/`.

## 5) WhatsApp Contact Setup

In `site.json`:

- `contact.whatsapp.number` must be digits only (example: `905551112233`)
- update `quickMessage` and `messageTemplate` for your tone

The contact form automatically:

- validates required fields
- builds the WhatsApp message
- redirects users to WhatsApp chat

## 6) Deployment

Deploy `dist/` on Netlify.
