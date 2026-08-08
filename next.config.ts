import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",

  /**
   * Left as real `require`s at runtime instead of being bundled.
   *
   * All three reach for Node internals the bundler cannot see through —
   * `imapflow` opens TLS sockets and loads its own protocol handlers,
   * `mailparser` pulls in optional character-set decoders by name, and
   * `nodemailer` resolves transports the same way. Bundling them either fails
   * at build time or, worse, succeeds and then cannot find a module for a
   * charset that only some real email uses.
   */
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
};

export default nextConfig;
