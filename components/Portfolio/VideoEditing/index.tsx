"use client";

import { useState } from "react";
import Short from "./Short";
import Long from "./Long";

const VideoEditing = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(1);

  return (
    <section id="portfolio" className="pt-6">
      {/* Tab section */}
      <div className="flex justify-center">
        <div className="text-md  mb-10 flex justify-center rounded-full border-2 border-gray-300 dark:border-gray-50 md:gap-10 ">
          {[
            { id: 1, title: "Short Form Videos" },
            { id: 2, title: "Long Form Videos" },
          ].map((i) => {
            return (
              <div
                key={i.id}
                className={`inline-flex w-1/2 cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-full px-3 py-1 text-center text-xs md:px-8 md:text-lg md:font-semibold ${
                  selectedTabIndex === i.id
                    ? " bg-slate-200 text-blue-800 dark:bg-gray-50"
                    : "text-gray-900 dark:text-white"
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
      <div className="container flex justify-center">
        {selectedTabIndex === 1 && <Short />}
        {selectedTabIndex === 2 && <Long />}
      </div>
    </section>
  );
};

export default VideoEditing;
