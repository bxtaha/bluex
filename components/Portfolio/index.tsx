"use client";

import { useState } from "react";
import SectionTitle from "../Common/SectionTitle";
import VideoEditing from "./VideoEditing";
import Website from "./Website";
import GraphicsDesign from "./GraphicsDesign";

const Portfolio = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(1);

  return (
    <section id="portfolio" className="pt-40">
      <SectionTitle
        title="Our Portfolio"
        paragraph="There are many variations of passages of Lorem Ipsum available but the majority have suffered alteration in some form."
        center
        mb="80px"
      />
      {/* Tab section */}
      <div className="flex justify-center">
        <div className="flex justify-center rounded-full border-2 border-blue-800 p-1 text-sm lg:gap-10  lg:p-4 lg:text-xl">
          {[
            { id: 1, title: "Video Editing" },
            { id: 2, title: "Website" },
            { id: 3, title: "Graphics Design" },
          ].map((i) => {
            return (
              <div
                key={i.id}
                className={`inline-flex cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center dark:text-white md:px-5 md:font-semibold ${
                  selectedTabIndex === i.id ? "bg-blue-800 text-white" : ""
                }`}
                onClick={() => setSelectedTabIndex(i.id)}
              >
                {i.title}
              </div>
            );
          })}
        </div>
      </div>
      {/* Tab details section */}
      <div className=" container">
        {selectedTabIndex === 1 && <VideoEditing />}
        {selectedTabIndex === 2 && <Website />}
        {selectedTabIndex === 3 && <GraphicsDesign />}
      </div>
    </section>
  );
};

export default Portfolio;
