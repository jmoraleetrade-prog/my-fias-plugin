# FIAS Plugin Development Guide

This project is a FIAS platform plugin — a React application that runs in a sandboxed iframe within the FIAS marketplace. This file provides the context AI coding assistants need to build, test, and submit plugins effectively.

## Project Structure

```
fias-plugin.json          # Plugin manifest (required) — name, permissions, pricing, AI configs
package.json              # Dependencies and scripts
src/
  index.tsx               # Entry point — must render into #root with <FiasProvider> wrapper
  App.tsx                 # Main component
vite.config.ts            # Vite dev server config (port 3100)
```

## SDK API Reference

All hooks require the app to be wrapped in `<FiasProvider>`:

```tsx
import { FiasProvider } from '@fias/arche-sdk';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <FiasProvider>
    <App />
  </FiasProvider>,
);
```

### `useFiasTheme()` — Platform theme tokens

**Permission:** `theme:read`
**Returns:** `FiasTheme | null` (null while loading)

```tsx
import { useFiasTheme } from '@fias/arche-sdk';

function MyComponent() {
  const theme = useFiasTheme();
  if (!theme) return null;

  return (
    <div
      style={{
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        fontFamily: theme.fonts.body,
        padding: theme.spacing.md,
        borderRadius: theme.components.cardRadius,
      }}
    >
      {theme.mode === 'dark' ? 'Dark mode' : 'Light mode'}
    </div>
  );
}
```

**FiasTheme shape:**

- `mode`: `'light' | 'dark'`
- `colors`: `{ primary, primaryText, secondary, accent, background, surface, card, cardText, text, textSecondary, muted, mutedText, border, error, warning, success, info }`
- `spacing`: `{ xs, sm, md, lg, xl }` (CSS values like `'8px'`)
- `fonts`: `{ body, heading, mono }` (font-family strings)
- `components`: `{ borderRadius, buttonRadius, cardRadius, inputRadius, shadowSm, shadowMd, shadowLg, borderWidth }`

### `useFiasFonts()` — Platform font catalog

**Permission:** none
**Returns:** `{ fonts, ensureFontLoaded }`

The platform vendors a catalog of fonts and injects every family's
`@font-face` into your plugin iframe automatically (the `.woff2` bytes
load lazily, only when a glyph is actually painted). So you can use any
catalog `family` name directly in CSS — no `<link>`, no `@import`, no
bundled font files, and **no Google Fonts** (those are blocked by the
plugin CSP). Build a font picker from `fonts`:

```tsx
import { useFiasFonts } from '@fias/arche-sdk';

function FontPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  const { fonts } = useFiasFonts();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: value }}>
      {fonts.map((f) => (
        <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
          {f.displayName}
        </option>
      ))}
    </select>
  );
}
```

- `fonts`: `FontCatalogEntry[]` — `{ family, displayName, category, system }`.
  `category` is one of `sans | serif | display | mono | handwriting | system`;
  `system: true` marks OS fonts (always available, no web font needed).
- `ensureFontLoaded(family, sizePx?)`: `Promise<void>` — **canvas / PDF only.**
  Normal DOM text needs nothing (the browser fetches the face when it
  paints). But `<canvas>` (incl. Konva / Fabric) and PDF exporters measure
  glyph metrics synchronously, so they rasterize the fallback face if the
  bytes aren't in yet. Call and `await` this before drawing. It never
  rejects, resolves instantly for already-loaded / system fonts, and
  resolves after a 3s timeout if the CDN is unreachable.

```tsx
const { ensureFontLoaded } = useFiasFonts();
await ensureFontLoaded(selectedFamily); // then draw to the canvas
```

`FONT_CATALOG` and `ensureFontLoaded` are also exported standalone for use
outside React (e.g. an export routine). For curated heading/body theme
pairings instead of the flat catalog, see `FONT_PAIRINGS`.

### `useFiasUser()` — Current user profile

**Permission:** `user:profile:read`
**Returns:** `FiasUser | null`

```tsx
import { useFiasUser } from '@fias/arche-sdk';

const user = useFiasUser();
// { userId: string, displayName: string, avatar: string | null }
```

### `useFiasStorage()` — Sandboxed file storage

**Permission:** `storage:sandbox`
**Returns:** `FiasStorageApi`

Storage is S3-backed and scoped per plugin + user. Data persists across sessions, browsers, and devices in live mode (staging/production). In mock mode, storage is in-memory and resets when the dev server restarts.

```tsx
import { useFiasStorage } from '@fias/arche-sdk';

const { readFile, writeFile, listFiles, deleteFile } = useFiasStorage();

await writeFile('data/settings.json', JSON.stringify(settings));
const content = await readFile('data/settings.json'); // string | null
const files = await listFiles('data/'); // string[]
await deleteFile('data/old.json');
```

**Error handling:** Storage calls can reject on infrastructure errors. Always use `.catch()` or `try/catch` -- an unhandled rejection will crash the plugin to a white screen.

### `useFiasDataStore()` — Document database

**Permission:** `data:store`
**Returns:** `FiasDataStoreApi`

A document database with collections, queries, and filtering. Data persists across sessions in live mode. Each collection can be `user`-scoped (private to each user) or `shared` (visible to all users of the plugin).

```tsx
import { useFiasDataStore } from '@fias/arche-sdk';

function MyComponent() {
  const dataStore = useFiasDataStore();

  // Collection management
  await dataStore.createCollection('scores', { userScope: 'user' }); // or 'shared'
  const collections = await dataStore.listCollections();
  await dataStore.deleteCollection('scores');

  // Document CRUD
  await dataStore.put<MyType>('scores', 'doc-key', { score: 100, name: 'Alice' });
  const doc = await dataStore.get<MyType>('scores', 'doc-key'); // MyType | null
  await dataStore.delete('scores', 'doc-key');

  // Query with filters, sorting, pagination
  const results = await dataStore.query<MyType>('scores', {
    filters: [
      { field: 'score', op: 'gte', value: 50 },
      { field: 'name', op: 'eq', value: 'Alice' },
    ],
    orderBy: { field: 'score', direction: 'desc' },
    limit: 20,
    cursor: nextCursor, // for pagination
  });
  // results = { documents: [{ key, data, updatedAt }], nextCursor: string | null }
}
```

Also available as an imperative API outside React components:

```tsx
import { fias } from '@fias/arche-sdk';

await fias.dataStore.put('scores', 'key', { score: 100 });
const doc = await fias.dataStore.get('scores', 'key');
```

**Collection scopes:**

- `user` (default): Each user sees only their own documents
- `shared`: All users of the plugin see and share the same documents

**Filter operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains` (JSONB containment), `exists`

**Limits:**

- 50 collections per plugin
- 10,000 documents per collection
- 100 KB per document
- 100 MB total storage per plugin
- Max 100 results per query, max 10 filters, max field path depth 5

**Rate limits (per minute):** `put` 120, `get` 300, `query` 60, `delete` 60, `createCollection` 10

**Error handling:** Data store calls can reject on infrastructure errors or limit violations. Always use `try/catch`. Common error codes: `COLLECTION_NOT_FOUND`, `DOCUMENT_TOO_LARGE`, `STORAGE_LIMIT_REACHED`, `RATE_LIMIT`.

### `useEntityInvocation()` — Invoke AI models

**Permission:** `entities:invoke`
**Returns:** `EntityInvocationApi`

Entities are shared capabilities (model access). Your plugin provides the context (system prompt, input) at invoke time.

```tsx
import { useEntityInvocation } from '@fias/arche-sdk';

function AISummarizer() {
  const { invoke, isLoading, result, error, streamingText } = useEntityInvocation();

  async function summarize(text: string) {
    await invoke({
      entityId: { capability: 'text-standard' }, // a platform text capability — see "Choosing a text model" below
      input: text, // what to process
      systemPrompt: 'You are a concise summarizer. Return a 2-3 sentence summary.',
    });
  }

  // `streamingText` accumulates tokens during the call AND continues to hold
  // the full text after the call resolves — it is NOT cleared. `result.output`
  // also contains the full text once `invoke()` resolves. Render ONE slot only
  // — `streamingText` while loading, `result.output` afterwards — or the
  // response appears twice.
  return (
    <div>
      <button onClick={() => summarize('...')} disabled={isLoading}>
        Summarize
      </button>
      <p>{isLoading ? streamingText : result?.output}</p>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

The `systemPrompt` tells the AI how to behave — this is where your plugin's intelligence lives.

#### Choosing a text model

The `entityId` parameter accepts three forms. **Prefer the capability selector** over a hardcoded model id: the platform's models evolve and get retired, and a capability lets your plugin pick up the current best model automatically without a code edit. When the platform retires the model behind a capability, it re-points the capability — your plugin keeps working.

```tsx
// 1. By capability (recommended) — resolved to the platform's current model
//    for that tier, and re-pointed automatically if that model is retired.
await invoke({
  entityId: { capability: 'text-standard' }, // 'text-fast' | 'text-standard' | 'text-advanced'
  input,
  systemPrompt: '...',
});

// 2. AI router — let the platform pick a model per request based on the
//    query's complexity. Optionally bias the tier with routingPreference.
await invoke({
  entityId: 'ent_fias_ai',
  input,
  systemPrompt: '...',
  routingPreference: 'cost', // 'auto' (default) | 'speed' | 'cost' | 'balanced' | 'performance'
});

// 3. A specific model id (back-compat) — pins one model. It will stop working
//    if that model is retired; use a capability for retirement resilience.
await invoke({ entityId: 'ent_modeldef_haiku_45', input, systemPrompt: '...' });
```

The text capabilities:

| Capability      | Use it for                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| `text-fast`     | Cheapest, fastest — classification, extraction, short responses, high volume |
| `text-standard` | Balanced, general-purpose text generation (the sensible default)             |
| `text-advanced` | Most capable — complex reasoning, nuanced writing, long-form output          |

Browse specific models with `npx fias-dev entities`.

### `useImageGeneration()` — Generate images via AI models

**Permission:** `entities:image_generate`
**Returns:** `ImageGenerationApi`

Generate images using platform image models. Images are saved to the user's Fias file system and a display URL is returned.

#### Choosing an image model

The `entityId` parameter accepts three forms. **Prefer the selector forms** (`platformRecommended` / `providerRecommended`) over hardcoded entity IDs: the platform's recommendations evolve, models get retired, and a selector lets your plugin pick up the current best automatically without a code edit. Hardcoded IDs are still supported for back-compat and for cases where you want a specific model — but if the platform retires that exact entity, your plugin breaks unless the platform has registered a successor.

```tsx
// 1. Platform's blessed pick for a workflow + optional style (RECOMMENDED).
//    Asking for `image-to-image` will never return a model that can't do it.
generate({
  entityId: { platformRecommended: { mode: 'text-to-image', style: 'illustration' } },
  prompt: "A child's storybook page of a fox in the forest",
});

// 2. A specific provider's blessed pick. Use when your plugin's value prop
//    depends on a particular provider's quirks.
generate({
  entityId: { providerRecommended: { provider: 'openai', mode: 'image-to-image' } },
  prompt: 'Make it look like an oil painting',
  referenceImage: { fileId: previousImage.fileId },
});

// 3. Explicit entityId — back-compat path. Use only when you want a specific
//    model. If the entity has been deprecated, the response includes
//    `deprecation: { requestedEntityId, resolvedEntityId, deprecatedAt }` and
//    you get the successor.
generate({
  entityId: 'ent_modeldef_gpt_image_1_5',
  prompt: 'A serene mountain landscape at sunset',
});
```

Mode values: `'text-to-image'` (baseline), `'image-to-image'` (requires `referenceImage`), `'vector'` (SVG output). Style values: `'illustration'` (stylized / digital-art) or `'photoreal'`.

Use `npx fias-dev entities --detail <entityId>` to check supported sizes, qualities, and styles for each model.

#### Full example

```tsx
import { useImageGeneration } from '@fias/arche-sdk';

function ImageMaker() {
  const { generate, isLoading, result, error } = useImageGeneration();

  return (
    <div>
      <button
        onClick={() =>
          generate({
            entityId: { platformRecommended: { mode: 'text-to-image' } },
            prompt: 'A serene mountain landscape at sunset',
            size: '16:9',
            quality: 'high',
          })
        }
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Image'}
      </button>
      {result && (
        <>
          <img src={result.imageUrl} alt="Generated" />
          {result.deprecation && (
            <p style={{ color: 'orange' }}>
              Note: requested entity "{result.deprecation.requestedEntityId}" is deprecated;
              auto-substituted "{result.deprecation.resolvedEntityId}". Update your code.
            </p>
          )}
        </>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### `useImageEntities()` — Discover image-generation entities

**Permission:** `entities:image_generate`
**Returns:** `{ entities, isLoading, error, refetch }`

Use to render a "let the user pick a model" picker. For the common case of "just give me something good," skip discovery and pass a selector directly to `useImageGeneration`:

```tsx
await generate({
  entityId: { platformRecommended: { mode: 'text-to-image' } },
  prompt: '...',
});
```

Discovery hook usage:

```tsx
import { useImageEntities } from '@fias/arche-sdk';

const { entities, isLoading } = useImageEntities({
  modes: ['image-to-image'],
  supportsReferenceImage: true,
});
// entities[i]: { entityId, displayName, provider, modes, supportedSizes,
//                supportsReferenceImage, isPlatformRecommended, ... }
```

Each entry is scrubbed — only fields a UI legitimately needs (no provider model strings, no endpoints, no execution config).

### `useBackgroundRemoval()` — Client-side background removal

**Permission:** `entities:image_remove_background`
**Returns:** `BackgroundRemovalApi`

Runs the imgly WASM model inside the host page — bytes never leave the user's device. Returns a transparent PNG.

```tsx
import { useBackgroundRemoval } from '@fias/arche-sdk';

const { removeBackground, isLoading } = useBackgroundRemoval();
const transparentPng = await removeBackground(jpegBlob);
```

**Limits:** input ≤ 25 MiB, PNG/JPEG only, rate-limited to 10/min per arche per user. Throws on size violation rather than returning a result.

### Audio capability hooks (auto-generated)

**Permission:** `entities:audio_generate`
**Returns (per hook):** `{ invoke, isLoading, result, error }`

Specialty capabilities expose **typed convenience hooks** generated from the platform's surface registry. Each hook bakes in a `surfaceKey` and infers params/result types from the surface's schemas.

Currently shipped audio hooks: `useLyriaMusic`, `useElevenLabsTts`, `useElevenLabsMusic`, `useElevenLabsSfx`, `useElevenLabsStt`, `useElevenLabsAudioIsolation`, `useElevenLabsForcedAlignment`, `useElevenLabsVoiceChanger`, `useElevenLabsVoiceDesign`. Browse the full surface list with `npx fias-dev entities`.

A legacy `useAudioGeneration()` hook still ships for back-compat with code written before the typed-surface migration. New plugins should use the typed hooks above — the legacy hook will be removed in a future major version.

```tsx
import { useElevenLabsTts } from '@fias/arche-sdk';

const { invoke, isLoading, result } = useElevenLabsTts();
await invoke({ text: 'Hello world', voiceId: '...' });
// result: { audioUrl, audioRef, durationMinutes, costCredits, ... }
```

For surfaces without a typed wrapper yet, the generic substrate:

```tsx
import { useSurface } from '@fias/arche-sdk';

const { invoke } = useSurface<MyParams, MyResult>('my.surface-key');
```

Default per-request timeout is 180 s (covers TTS for long text and Lyria multi-clip generation).

### `useVaultDocuments()` — User-owned Vault documents

**Permissions:** `vault:documents:read` (list / read / getDownloadUrl / search), `vault:documents:write` (write / update / delete / attach / detach / upload)
**Returns:** `VaultDocumentsApi`

The Vault is the platform's persistent document store for the signed-in user. Distinct from `useFiasStorage` (per-plugin sandbox): Vault docs live in the user's My Data, survive plugin uninstall, and can be cross-referenced from other arches. Documents this arche creates are scoped to it (`source_arche_id`) and surfaced to the user under `/My-Fias/Arches/<archeId>/`.

**Most common use:** images returned from `useImageGeneration()` are auto-saved here. The result includes a `documentId` — pass it to `getDownloadUrl()` later to refresh the presigned URL after the original ~1h TTL expires.

```tsx
import { useVaultDocuments } from '@fias/arche-sdk';

const vault = useVaultDocuments();

// Refresh a presigned URL (cached client-side, auto-refreshed before expiry)
const { url, expiresAt, contentType } = await vault.getDownloadUrl(documentId);

// List documents this arche owns
const { documents, nextCursor } = await vault.list({ search: 'invoice', limit: 50 });

// Write a small text/JSON document (UTF-8, ≤ 1 MB)
const { documentId } = await vault.write({
  name: 'settings.json',
  content: JSON.stringify(settings),
  contentType: 'application/json',
  tags: ['config'],
});

// Upload a binary or larger document — wraps the two-step presigned-PUT flow
const result = await vault.upload(bytes, {
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
});
// result.status transitions 'uploaded' → 'available' once indexed for search

// Semantic search across documents this arche owns
// (burns user credits per the AI Markup Invariant — call sparingly)
const { matches } = await vault.search('quarterly revenue', { topK: 5 });

// Update / delete
await vault.update(documentId, { name: 'new-name.json', tags: ['archived'] });
await vault.delete(documentId); // soft-delete, recoverable from My Data Trash
```

**Cross-arche attachment.** A document can be referenced from another arche's record (Business Contact, Company, Fias 360 Renewal in V-1). The reference points at the document but does NOT expose its contents to the target arche.

```tsx
const { referenceId } = await vault.attach(documentId, {
  regardingType: 'vault_business_contact',
  regardingId: contactId,
});
await vault.detach(documentId, referenceId);
```

**Sensitivity tiers** (`'standard'` | `'confidential'` | `'proprietary'`) gate downstream read access per the Vault's standard matrix. Defaults to `'standard'`.

**`fetchVaultDocumentDownloadUrl(documentId)`** — non-React function that shares the hook's client-side URL cache. Use from PDF exporters, image preloaders, or other non-component code paths.

### `useArcheAssets()` — Contributor-published asset library

**Permission:** `assets:read`
**Returns:** `ArcheAssetsApi`

A frozen set of images the arche's contributor uploaded and pinned to the published version — logos, brand images, hole maps, reference photos. Each entry has an immutable `assetId` and a short-lived `signedUrl` (~5 min) suitable for `<img src>`.

```tsx
import { useArcheAssets } from '@fias/arche-sdk';

const { list, getUrl } = useArcheAssets();

const { entries, nextCursor } = await list({ limit: 50 });
// entries[i]: { assetId, signedUrl, expiresAt, contentType, width, height,
//               sizeBytes, name, altText, tags }

// Refresh a signed URL when it's about to expire
const fresh = await getUrl(assetId);
```

Cache the `assetId`; refresh `signedUrl` via `getUrl()` rather than persisting URLs across sessions.

### `useFiasStore()` — In-app purchases (IAP)

**Permission:** `store:purchase`
**Returns:** `FiasStoreApi`

How a plugin charges the signed-in user for anything inside the arche — one-time unlocks, consumables, subscriptions, paid sign-ups, donations. **All in-arche payments go through this hook.** The arche never handles payment directly: the platform shows a confirmation overlay, debits the user's Fias credit balance, and returns a result. Do not import Stripe or any external payment SDK — they are sandboxed out and not needed.

Products are declared in `fias-plugin.json` under a `products` array (see Manifest Reference below). Each product has a stable `identifier` your code passes to `purchase()`. Prices are denominated in **Fias credits**, not USD.

```tsx
import { useFiasStore } from '@fias/arche-sdk';

function UnlockButton() {
  const { products, purchase, hasEntitlement, isLoading } = useFiasStore();
  const product = products.find((p) => p.productIdentifier === 'pro_unlock');

  if (isLoading || !product) return null;
  if (hasEntitlement('pro_unlock')) return <p>Pro features unlocked.</p>;

  async function buy() {
    const result = await purchase('pro_unlock');
    if (!result.success) {
      // Common codes: INSUFFICIENT_CREDITS, USER_CANCELLED, PRODUCT_NOT_FOUND
      console.error(result.error);
    }
    // On success, `entitlements` updates automatically.
  }

  return <button onClick={buy}>Unlock for {product.priceCredits} credits</button>;
}
```

**Product types:**

- `consumable` — buyable repeatedly (tokens, energy, single donations, sign-up entries). Does NOT create an entitlement; track usage in `useFiasDataStore`.
- `non_consumable` — one-time purchase, permanent entitlement.
- `auto_renewable` — subscription that renews automatically. Requires `subscriptionPeriod`: `weekly` | `monthly` | `quarterly` | `yearly`.
- `non_renewing` — time-limited access that does NOT renew (season pass).

**API surface:**

- `products: StoreProduct[]` — loaded on mount.
- `purchase(productIdentifier, { quantity? }) → StorePurchaseResult` — triggers the platform confirmation overlay. `quantity` only applies to consumables.
- `entitlements: StoreEntitlement[]` — current non-consumable + subscription entitlements; updated automatically after a successful purchase.
- `hasEntitlement(productIdentifier) → boolean` — convenience check.
- `getPurchaseHistory() → Promise<StorePurchase[]>` — full log including consumables.
- `restorePurchases() → Promise<StoreEntitlement[]>` — re-sync entitlements from the platform.

**Error handling:** `purchase()` returns `{ success: false, error, code }` rather than throwing — always branch on `result.success`. The user must be signed in to a Fias account; IAP is not available to anonymous visitors on public arches.

### `useFiasNavigation()` — In-plugin routing

**Permission:** None required
**Returns:** `FiasNavigationApi`

```tsx
import { useFiasNavigation } from '@fias/arche-sdk';

const { navigateTo, currentPath } = useFiasNavigation();
navigateTo('/settings');
```

### `useStepNavigation()` — Multi-step workflows

**Permission:** None for in-memory use; `storage:sandbox` when `persistKey` is set (it reads/writes `__state/<persistKey>` via the storage bridge).
**Returns:** `StepNavigationApi`

```tsx
import { useStepNavigation } from '@fias/arche-sdk';

// Pass `persistKey` to survive preview rebuilds (do NOT additionally wrap
// currentStep in usePersistentState — that creates two state sources and
// a bidirectional sync loop).
const { currentStep, setCurrentStep } = useStepNavigation('step-1', {
  persistKey: 'workflow-step',
});
```

The host can also drive step changes from outside the iframe — for example, when the user clicks a node in an external graph view. The hook listens for those `step_navigate` messages and updates `currentStep` automatically, so unexpected step transitions aren't a bug to chase.

### `usePersistentState()` — Auto-saving state

**Permission:** `storage:sandbox`

Uses `useFiasStorage` under the hood — same persistence rules apply (durable in live mode, in-memory in mock mode).

```tsx
import { usePersistentState } from '@fias/arche-sdk';

const [count, setCount] = usePersistentState<number>('counter', 0);
// Automatically persists to storage on change
```

**Writes are debounced (SDK ≥ 1.8.0).** The in-memory value updates synchronously, but the underlying `storage_write` is coalesced (250 ms trailing-edge debounce, 1 s max-wait, flushed on unmount). Safe to call from `requestAnimationFrame` and other high-frequency handlers. For state that updates every frame (game positions, drag coordinates), still prefer plain `useState` — persisting transient state is wasteful and not useful on reload.

### `fias` — Imperative utilities

Use the `fias` namespace when you need bridge operations from outside a React component (event handlers attached imperatively, utility modules, non-React entry points).

```tsx
import { fias } from '@fias/arche-sdk';

fias.ready(); // Manual ready signal (FiasProvider does this automatically)
fias.resize(800); // Resize iframe height
fias.showToast('Saved!', 'success'); // Toast: 'info' | 'success' | 'warning' | 'error'

// fias.dataStore mirrors useFiasDataStore() — same operations, same limits.
// Requires the `data:store` permission.
await fias.dataStore.createCollection('scores', { userScope: 'user' });
await fias.dataStore.put('scores', 'doc-key', { score: 100 });
const doc = await fias.dataStore.get('scores', 'doc-key');
await fias.dataStore.query('scores', {
  filters: [{ field: 'score', op: 'gte', value: 50 }],
});
await fias.dataStore.delete('scores', 'doc-key');
await fias.dataStore.listCollections();
await fias.dataStore.deleteCollection('scores');
```

### Advanced exports (rarely needed)

The SDK also exports the following for advanced use cases. Most plugins don't need them.

- `VALID_PLUGIN_PERMISSIONS`, `isValidPluginPermission(perm)` — runtime permission validation.
- Theme catalog: `DARK_THEME`, `LIGHT_THEME`, `getDefaultTheme()`, `THEME_CATALOG`, `getThemeById()`, `FONT_PAIRINGS`, `getFontPairingById()` — useful when the plugin lets the user pick from preset themes/fonts.
- Bridge introspection: `FiasBridge`, `getBridge()`, `resetBridge()`, `SDK_BRIDGE_PROTOCOL_VERSION`, `SDK_REQUIRES_HOST_PROTOCOL_VERSION` — testing and advanced cases that need direct bridge control.

## Manifest Reference (`fias-plugin.json`)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "main": "src/index.tsx",
  "archeType": "tool",
  "tags": ["utility"],
  "pricing": { "model": "free", "currency": "usd" },
  "permissions": ["theme:read", "entities:invoke"],
  "sdk": "^2.0.0",
  "dependencies": { "recharts": "2.15.0" }
}
```

**Fields:**

| Field                 | Req  | Description                                                                                             |
| --------------------- | ---- | ------------------------------------------------------------------------------------------------------- |
| `name`                | Yes  | Plugin identifier (lowercase, hyphens)                                                                  |
| `version`             | Yes  | Semver (e.g., `"1.0.0"`)                                                                                |
| `description`         | Yes  | Short marketplace description                                                                           |
| `expandedDescription` | No   | Long-form marketplace copy                                                                              |
| `main`                | Yes  | Entry point source file                                                                                 |
| `archeType`           | Yes  | `"tool"` or `"site"`                                                                                    |
| `categorySlug`        | No   | Marketplace category for discovery                                                                      |
| `icon`                | No   | Relative path to icon asset (shown in marketplace + arche header)                                       |
| `tags`                | No   | Discovery tags                                                                                          |
| `pricing`             | Yes  | Marketplace **listing** pricing (see "Pricing detail" below). NOT for in-arche charges — use `products` |
| `permissions`         | Yes  | Array of permission scopes (see below)                                                                  |
| `products`            | No   | IAP product catalog for `useFiasStore()` (see "Defining IAP products" below)                            |
| `isPublic`            | No   | Default `false`. Anonymous visitors can view (see "Public arches" below)                                |
| `isFullScreen`        | No   | Default `false`. Renders without platform chrome — implies `archeType: "site"`                          |
| `isListed`            | No   | Default `true`. Visible in marketplace store                                                            |
| `sdk`                 | Yes  | SDK version range                                                                                       |
| `dependencies`        | No   | npm packages with **exact** versions (max 20)                                                           |
| `archeIds`            | Auto | Per-environment IDs written by the CLI after first publish — don't hand-edit                            |

**Pricing detail:**

`pricing` is the marketplace **listing** model — controls what the platform charges users to access the arche itself. It does NOT cover charges the plugin makes from inside (entry fees, unlocks, donations) — for those, use IAP via `products`.

| `pricing.model` | Required sub-fields             |
| --------------- | ------------------------------- |
| `"free"`        | none                            |
| `"fixed"`       | `priceCents`                    |
| `"per_use"`     | `baseFeeCents`                  |
| `"tiered"`      | `tiers: [{ upTo, priceCents }]` |

Other optional sub-fields: `currency: "usd"` (only USD supported today), `platformFeePercent` (override the default platform cut — non-standard).

**Permissions:** `theme:read`, `user:profile:read`, `storage:sandbox`, `data:store`, `entities:invoke`, `entities:image_generate`, `entities:image_remove_background`, `entities:audio_generate`, `store:purchase`, `vault:documents:read`, `vault:documents:write`, `assets:read`

**Using AI:** Add `"entities:invoke"` to permissions, then use `useEntityInvocation()` with a model entity ID and your own `systemPrompt`. Browse available models with `npx fias-dev entities`.

**Defining IAP products (for `useFiasStore`):**

Add a `products` array to declare what users can buy inside the arche. Each entry needs a stable `identifier` your code passes to `purchase()`. Prices are in Fias credits.

```json
{
  "products": [
    {
      "identifier": "pro_unlock",
      "type": "non_consumable",
      "name": "Pro features",
      "description": "Permanent unlock for advanced features.",
      "priceCredits": 500
    },
    {
      "identifier": "monthly_sub",
      "type": "auto_renewable",
      "name": "Monthly subscription",
      "description": "Renewing access.",
      "priceCredits": 200,
      "subscriptionPeriod": "monthly",
      "subscriptionGroup": "pro"
    }
  ],
  "permissions": ["store:purchase"]
}
```

`store:purchase` must be in `permissions` whenever `products` is non-empty. Use `consumable` for things bought repeatedly (single donations, sign-up entries), `non_consumable` for one-time unlocks, `auto_renewable` / `non_renewing` for time-bounded access.

**Public arches (`isPublic: true`):**

Setting `isPublic: true` lets anonymous visitors (no Fias account) view the arche at `/a/<archeId>`. The UI renders without the platform sidebar. **Bridge operations still require auth** — `useFiasDataStore` writes, `useFiasStore.purchase()`, `useFiasStorage` reads, vault operations, etc. all require the visitor to be signed in. Public mode is for read-only landing pages, marketing pages, and shared-content viewers — not for collecting registrations or payments from anonymous users.

## Plugin Constraints

These are hard limits enforced by the platform. Code that violates these will fail review or be blocked at runtime.

### Hitting a limit? Tell the user about Entity requests

Don't just say "can't do that" when the user asks for something blocked by these rules — most often a direct external API call, a third-party service, or a capability the platform hasn't surfaced yet. The Fias team adds new **Entities** on request: platform-managed wrappers that hold credentials, handle auth, and expose the capability to plugins through `useEntityInvocation()` (or `useImageGeneration()` for image models). The plugin never bypasses the sandbox — it invokes the new Entity like any other model.

When you hit a constraint, say so AND tell the user: file an Entity request on the Customer Support arche at `https://platform.fias.io/a/arche_customer_support`. Describe the service, endpoints, and auth method needed; once the Entity ships, the plugin can call it via `useEntityInvocation` with no sandbox change. Then propose a fallback that works inside the current sandbox (mock data, a simpler path, deferring the call) so the build keeps moving while the request is in flight.

### Sandboxing

- Plugins run in an iframe with `sandbox="allow-scripts allow-forms allow-same-origin allow-downloads"`
- **No `fetch()` or `XMLHttpRequest`** — all network access is blocked
- **No access** to parent DOM, cookies, or localStorage
- **No external scripts or stylesheets** — everything must be bundled
- All platform communication goes through the bridge (SDK hooks)

### Size and File Limits

- **Bundle size:** Max 5 MB compressed
- **Dependencies:** Max 20, exact semver versions only (e.g., `"4.4.7"`, not `"^4.4.7"`)
- Platform packages (`react`, `react-dom`, `@fias/arche-sdk`) are provided — do not include in `dependencies`

### Rate Limits

- `entity_invoke`: 60/minute
- `storage_write`: 120/minute
- `storage_read`: 300/minute
- `storage_list`, `storage_delete`: 60/minute

A separate **runaway-loop detector** fires if any method is called >50 times in 5 s and blocks that method for 10 s. Errors include the target, e.g. `Runaway loop detected: "storage_write" (path: __state/gameState) …` — the path tells you where to debounce at the source.

### Security Rules (enforced during review)

- No `eval()`, `Function()`, `innerHTML`, or dynamic code execution
- No attempts to escape the iframe sandbox
- No credential collection or dark patterns
- No obfuscated code
- No accessing `window.parent`, `window.top`, or `document.cookie`

## Styling Guidelines

- Always use `useFiasTheme()` for colors, fonts, and spacing — never hardcode
- Support both light and dark modes (check `theme.mode`)
- Use `theme.components.cardRadius`, `theme.components.shadowMd`, etc. for consistent component styling
- The plugin renders at full width inside the platform layout

## Development Workflow

### Check for Updates (DO THIS FIRST)

**At the start of every new session**, install dependencies if they aren't already, then check if the FIAS packages and tooling are up to date:

```bash
# 1. Install deps first if node_modules/ is missing.
#    fias-dev is a binary inside @fias/plugin-dev-harness, not a standalone
#    npm package — `npx fias-dev …` before `npm install` falls through to
#    the registry and prints a misleading "404 Not Found" for fias-dev.
[ -d node_modules ] || npm install

# 2. Then check for updates.
npm outdated @fias/arche-sdk @fias/plugin-dev-harness
npx fias-dev sync --dry-run
```

If newer package versions are available, tell the user and ask if they want to update before proceeding. Stale packages can cause subtle bugs (e.g., mismatched API return types) that are hard to diagnose.

If `sync --dry-run` shows pending changes, tell the user and offer to run `npx fias-dev sync` to update AI instruction files and config from the latest SDK templates. This never touches source code or project-specific files (`package.json`, `fias-plugin.json`, `src/`).

### Starting Development

```bash
npm start              # Starts both Vite + dev harness
```

This starts the plugin in **mock mode** (free, offline). Open **http://localhost:3200** in your browser to see the plugin running inside the harness.

Port 3200 is the dev harness that wraps the plugin in the platform iframe. Port 3100 is just the raw Vite server and won't work correctly on its own.

### Switching to Live Mode (Real AI)

In the harness toolbar, click the **MOCK** badge to switch to **LIVE** mode. If you haven't authenticated yet, a login popup will open automatically. Sign in with your FIAS account and the harness will switch to live mode.

You can choose between **Staging** and **Production** environments using the dropdown in the toolbar. Each environment requires separate authentication.

**IMPORTANT:** Live mode uses real AI and costs credits. Mock mode returns canned responses and does NOT call real AI models. If you want actual AI-powered features to work during testing, you MUST switch to live mode.

### CLI Authentication (Alternative)

You can also authenticate via the command line:

```bash
npx fias-dev login                    # Authenticate with prod (default)
npx fias-dev login --env staging      # Authenticate with staging (internal)
```

### Browsing Available Entities

```bash
npx fias-dev entities                              # List all
npx fias-dev entities --search "image"             # Search by keyword
npx fias-dev entities --type "model-definition"    # Filter by type
npx fias-dev entities --detail ent_modeldef_gpt_image_1_5 # Full entity details (capabilities, sizes, pricing)
```

### Validating the Manifest

```bash
npx fias-dev validate
```

### Submitting to the Arche Store

```bash
npm run submit
# Builds, validates, packages, uploads, submits for AI review
```

The first time you list a plugin in the marketplace there is a one-time
listing fee; subsequent submissions of the same plugin only pay a small
per-review fee. The harness fetches the exact amount from the server and
shows it before you confirm — never assume a hardcoded price.

If the AI review rejects your submission, the listing-fee portion is
refunded automatically (the per-review portion is not, since review work
happened either way).

### Managing the asset library (for `useArcheAssets`)

`useArcheAssets()` reads a contributor-curated set of images pinned to the arche's published version. Populate that library with the `assets` subcommands. Each command accepts `--env <prod|staging|local>` (default `prod`) and `--arche-id <id>` (auto-resolved from the manifest when omitted).

```bash
npx fias-dev assets enable                  # Turn on the asset library for this arche
npx fias-dev assets status                  # Quota usage + billing summary
npx fias-dev assets upload <dir>            # Bulk-upload images; subfolder name → default tag
                                            # Flags: --concurrency <1-16>, --dry-run
npx fias-dev assets list                    # List assets; --tag <tag>, --limit <1-100>
npx fias-dev assets tag <assetId> --add <t> # Add or remove tags; --remove <t> also supported
npx fias-dev assets delete <assetId>        # Soft-delete (excluded from future publishes); -y to skip confirm
npx fias-dev assets disable                 # Turn off the asset library
```

Uploads stage into the contributor's draft set; they only become visible to plugin runtimes after the next `npm run submit` publishes a new arche version. Existing published versions keep their original frozen snapshot.

### Managing collaborators

Multi-developer plugins use `arche_collaborators` for operational ownership (publishing, team management) — distinct from financial ownership (`contributor_id`, which is immutable in v1). Every arche must keep ≥1 active owner; revokes that would drop to zero return `MUST_KEEP_ONE_OWNER`.

```bash
npx fias-dev collaborators list                            # List active collaborators
npx fias-dev collaborators add <email|username|userId> \   # Default role: publisher
    --role <owner|publisher|viewer> --expires <iso>        # Owners cannot have expiry
npx fias-dev collaborators set <identifier> \              # Change role and/or expiry
    --role <role> --expires <iso>                          # --no-expires clears expiry
npx fias-dev collaborators remove <identifier>             # Revoke a collaborator
```

All commands accept `--env <prod|staging|local>` (default `prod`).

### Other CLI diagnostics

```bash
npx fias-dev check-auth                # Print per-environment auth status (which envs have saved keys)
```

## Common Patterns

### Theme-Aware Card Component

```tsx
function Card({ children }: { children: React.ReactNode }) {
  const theme = useFiasTheme();
  if (!theme) return null;

  return (
    <div
      style={{
        backgroundColor: theme.colors.card,
        color: theme.colors.cardText,
        borderRadius: theme.components.cardRadius,
        boxShadow: theme.components.shadowMd,
        border: `${theme.components.borderWidth} solid ${theme.colors.border}`,
        padding: theme.spacing.lg,
      }}
    >
      {children}
    </div>
  );
}
```

### Streaming AI Response

```tsx
function AIChat() {
  const { invoke, isLoading, streamingText, result } = useEntityInvocation();
  const [input, setInput] = useState('');

  return (
    <div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <button
        onClick={() =>
          invoke({
            entityId: 'ent_fias_ai',
            input,
            systemPrompt: 'You are a helpful assistant.',
          })
        }
        disabled={isLoading}
      >
        Send
      </button>
      <div>{isLoading ? streamingText : result?.output}</div>
    </div>
  );
}
```

### Persistent Settings

```tsx
function Settings() {
  const [settings, setSettings] = usePersistentState('settings', {
    notifications: true,
    fontSize: 14,
  });

  return (
    <label>
      <input
        type="checkbox"
        checked={settings.notifications}
        onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
      />
      Notifications
    </label>
  );
}
```
