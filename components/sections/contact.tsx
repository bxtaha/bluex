import { getContactSettings } from "@/lib/contact";
import { ContactPanel } from "@/components/sections/contact-panel";

/**
 * Contact.
 *
 * A server component, so the address, the WhatsApp number and the intro
 * paragraph are read on the server and arrive in the HTML — the contact
 * details of a business are exactly the thing that must not depend on a
 * client-side fetch resolving. `ContactPanel` is the interactive half.
 */
export async function Contact() {
  const settings = await getContactSettings();
  return <ContactPanel settings={settings} />;
}
