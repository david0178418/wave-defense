# Waves Strategy

A web-based strategy game built with TypeScript and PixiJS.

## Prerequisites

- [Bun](https://bun.sh) v1.2.4 or higher
- TypeScript 5.x

## Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/yourusername/waves-strategy.git
cd waves-strategy

# Install dependencies
bun install
```

## Available Scripts

The following scripts are available to help you develop and build the application:

- **Development Server**:
  ```bash
  bun run dev
  ```
  Starts the development server and opens the application in your browser.

- **Type Checking**:
  ```bash
  bun run tsc
  ```
  Runs the TypeScript compiler to check for type errors without producing output files.

## Project Structure

- `src/`: Source code
  - `app.ts`: Main application entry point
  - `bundles/`: Game system bundles
  - `entities/`: Entity configurations
  - `lib/`: Libraries and utilities
  - `types.ts`: TypeScript type definitions

## Development

This project uses Bun as the JavaScript runtime and package manager. Bun provides a fast development experience with built-in bundling capabilities.

### Adding Dependencies

```bash
bun add <package-name>
```

### Adding Development Dependencies

```bash
bun add -d <package-name>
```

## Building for Production

To build the application for production:

```bash
# First check for type errors
bun run tsc

# Then build the application
bun build --target browser ./index.html --outdir ./dist
```

## License

This project is licensed under the MIT License.

---

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.