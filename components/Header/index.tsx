"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggler from "./ThemeToggler";
import menuData from "./menuData";
import { motion } from "framer-motion";
import { useActiveSectionContext } from "@/contexts/active-session-context";

const Header = () => {
  // Navbar toggle
  const [navbarOpen, setNavbarOpen] = useState(false);
  const navbarToggleHandler = () => {
    setNavbarOpen(!navbarOpen);
  };

  // Sticky Navbar
  const [sticky, setSticky] = useState(true);
  // const handleStickyNavbar = () => {
  //   if (window.scrollY >= 0) {
  //     setSticky(true);
  //   } else {
  //     setSticky(false);
  //   }
  // };
  // useEffect(() => {
  //   window.addEventListener("scroll", handleStickyNavbar);
  // });

  // const usePathName = usePathname();

  const { activeSection, setActiveSection } = useActiveSectionContext();

  const [activeSectionName, setActiveSectionName] = useState("Home");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      const sections = document.querySelectorAll("section");
      let foundActiveSection = null;

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        if (
          +scrollPosition + 50 >= sectionTop &&
          scrollPosition < sectionTop + sectionHeight
        ) {
          foundActiveSection = section.id;
        }
      });
      setActiveSectionName(foundActiveSection);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setActiveSection(
      activeSectionName?.charAt(0)?.toUpperCase() + activeSectionName?.slice(1),
    );
  }, [activeSectionName]);

  return (
    <>
      <header
        className={`header left-0 top-0 z-40 flex w-full items-center ${
          sticky
            ? "fixed z-[9999] bg-white !bg-opacity-80 shadow-sticky backdrop-blur-sm transition dark:bg-gray-dark dark:shadow-sticky-dark"
            : "absolute bg-transparent"
        }`}
      >
        <div className="container">
          <div className="relative -mx-4 flex items-center justify-between">
            <div className="w-60 max-w-full px-4 xl:mr-12">
              <Link
                href="/#home"
                className={`header-logo block w-full ${
                  sticky ? "py-5 lg:py-5" : "py-8"
                } `}
                onClick={() => {
                  setActiveSection("Home");
                }}
              >
                <Image
                  src="/images/logo/logo-light.png"
                  alt="logo"
                  width={140}
                  height={30}
                  className="w-full dark:hidden"
                />
                <Image
                  src="/images/logo/logo-dark.png"
                  alt="logo"
                  width={140}
                  height={30}
                  className="hidden w-full dark:block"
                />
              </Link>
            </div>
            <div className="flex w-full items-center justify-between px-4">
              <div>
                <button
                  onClick={navbarToggleHandler}
                  id="navbarToggler"
                  aria-label="Mobile Menu"
                  className="absolute right-4 top-1/2 block translate-y-[-50%] rounded-lg px-3 py-[6px] ring-primary focus:ring-2 lg:hidden"
                >
                  <span
                    className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ${
                      navbarOpen ? " top-[7px] rotate-45" : " "
                    }`}
                  />
                  <span
                    className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ${
                      navbarOpen ? "opacity-0 " : " "
                    }`}
                  />
                  <span
                    className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 dark:bg-white ${
                      navbarOpen ? " top-[-8px] -rotate-45" : " "
                    }`}
                  />
                </button>

                <nav
                  id="navbarCollapse"
                  className={`navbar absolute right-0 z-30 w-[250px] rounded border-[.5px] border-body-color/50 bg-white px-6 py-4 duration-300 dark:border-body-color/20 dark:bg-dark lg:visible lg:static lg:w-auto lg:border-none lg:!bg-transparent lg:p-0 lg:opacity-100 ${
                    navbarOpen
                      ? "visibility top-full opacity-100"
                      : "invisible top-[120%] opacity-0"
                  }`}
                >
                  <ul className="block lg:flex lg:space-x-12">
                    {menuData.map((menuItem, index) => (
                      <li key={index} className="group relative">
                        <Link
                          href={menuItem.path}
                          className={`flex py-2 font-serif text-base font-semibold lg:mr-0 lg:inline-flex lg:px-0 lg:py-6 ${
                            activeSection === menuItem.title
                              ? "text-white dark:text-white"
                              : "text-dark hover:text-primary dark:text-white/70 dark:hover:text-primary"
                          }`}
                          onClick={() => {
                            setActiveSection(menuItem.title);
                          }}
                        >
                          {menuItem.title}
                          {activeSection === menuItem.title && (
                            <motion.span
                              className="absolute top-6 -z-10 -ms-[25%]  h-6   w-[150%] rounded-full bg-primary dark:bg-primary"
                              layoutId="activeSection"
                              transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 30,
                              }}
                            ></motion.span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
              <div className="flex items-center justify-end pr-16 lg:pr-0">
                <div className="rounded-full border border-primary shadow-lg dark:border-white">
                  <ThemeToggler />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
