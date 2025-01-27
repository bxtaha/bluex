"use client";

import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import NewsLatterBox from "./NewsLatterBox";

const Contact = () => {
  const form = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    emailjs
      .sendForm(
        "service_g88txqd", // Replace with your EmailJS service ID
        "template_sg3mdlp", // Replace with your EmailJS template ID
        form.current!,
        "1CzWFCuuFNo1WKbhs", // Replace with your EmailJS public key
      )
      .then(
        () => {
          setMessage("Your message has been sent successfully!");
          setIsSubmitting(false);
          form.current?.reset();
        },
        (error) => {
          setMessage("Failed to send message. Please try again.");
          setIsSubmitting(false);
          console.error("EmailJS Error:", error);
        },
      );
  };

  return (
    <section id="contact" className="overflow-hidden py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4 lg:w-7/12 xl:w-8/12">
            <div
              className="wow fadeInUp mb-12 rounded-lg bg-white px-8 py-11 shadow-three dark:bg-gray-dark sm:p-[55px] lg:mb-5 lg:px-8 xl:p-[55px]"
              data-wow-delay=".15s"
            >
              <h2 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                Need Help? Open a Ticket
              </h2>
              <p className="mb-12 text-base font-medium text-body-color">
                Our support team will get back to you ASAP via email.
              </p>
              <form ref={form} onSubmit={sendEmail}>
                <div className="-mx-4 flex flex-wrap">
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8">
                      <label
                        htmlFor="name"
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        Your Name
                      </label>
                      <input
                        type="text"
                        name="user_name"
                        placeholder="Enter your name"
                        required
                        className="w-full rounded-lg border border-stroke bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8">
                      <label
                        htmlFor="email"
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        Your Email
                      </label>
                      <input
                        type="email"
                        name="user_email"
                        placeholder="Enter your email"
                        required
                        className="w-full rounded-lg border border-stroke bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-8">
                      <label
                        htmlFor="message"
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        Your Message
                      </label>
                      <textarea
                        name="message"
                        rows={5}
                        placeholder="Enter your message"
                        required
                        className="w-full resize-none rounded-lg border border-stroke bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary"
                      ></textarea>
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-9 py-4 text-base font-medium text-white shadow-submit duration-300 hover:bg-primary/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Submit Ticket"}
                    </button>
                    {message && (
                      <p className="mt-4 text-green-500">{message}</p>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="w-full px-4 lg:w-5/12 xl:w-4/12">
            <NewsLatterBox />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
