import Image from "next/image";
import img1 from "public/videos/shorts/1.png";
import img2 from "public/videos/shorts/2.png";
import img3 from "public/videos/shorts/3.png";
import img4 from "public/videos/shorts/4.png";
import img5 from "public/videos/shorts/5.png";
import img6 from "public/videos/shorts/6.png";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useState } from "react";
const shortVideos = [
  {
    id: 1,
    title: "Travel Vlog",
    url: "https://youtube.com/shorts/7n5Pxk1o-m4",
    img: img1,
  },
  {
    id: 2,
    title: "Cooking Tips",
    url: "https://youtube.com/shorts/g418ky0SYXc",
    img: img2,
  },
  {
    id: 3,
    title: "Tech Review",
    url: "https://youtube.com/shorts/s-sieC9QwQM",
    img: img3,
  },
  {
    id: 4,
    title: "Fitness Routine",
    url: "https://youtube.com/shorts/slROqmn3VTg",
    img: img4,
  },
  {
    id: 5,
    title: "DIY Crafts",
    url: "https://youtube.com/shorts/t2saQrzxSmQ",
    img: img5,
  },
  {
    id: 6,
    title: "Funny Moments",
    url: "https://youtube.com/shorts/_PQG_8mzOf0",
    img: img6,
  },
];
const Short = () => {
  // Function to convert Shorts URL to embeddable format
  const getEmbedUrl = (url: string) => {
    const videoId = url.split("/shorts/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const [playing, setPlaying] = useState<number | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {shortVideos.map((i) => {
          return (
            <div
              onClick={() => setPlaying(i.id)}
              key={i.id}
              className="relative h-[500px] max-w-[280px] cursor-pointer rounded-xl border-4 border-blue-500 text-white"
            >
              {playing === i.id ? (
                <iframe
                  className="h-full w-full rounded-lg"
                  src={getEmbedUrl(i.url)}
                  title={i.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <div className=" absolute left-0 top-0 max-h-[500px]">
                    <Image
                      src={i.img}
                      className="rounded-lg object-cover "
                      style={{ height: "493px" }}
                      alt=""
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center   text-4xl ">
                    <PlayCircleOutlineIcon className="mt-40 text-6xl text-gray-400" />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Short;
