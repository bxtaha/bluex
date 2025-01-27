import Link from "next/link";
import Image from "next/image";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import img1 from "public/images/portfolio/1.png";
import img2 from "public/images/portfolio/2.png";
import img3 from "public/images/portfolio/3.png";
import img4 from "public/images/portfolio/4.png";

const Develop = () => {
  const websites = [
    {
      id: 1,
      title: "Website 4",
      url: "https://tazkiafoundation.com/",
      img: img1,
      translate: "group-hover:-translate-y-[358%]",
    },
    {
      id: 2,
      title: "Website 1",
      url: "https://uniticexchange.com/",
      img: img2,
      translate: "group-hover:-translate-y-[156%]",
    },
    {
      id: 3,
      title: "Website 2",
      url: "https://papaya-blini-048d15.netlify.app/",
      img: img3,
      translate: "group-hover:-translate-y-[177.5%]",
    },
    {
      id: 4,
      title: "Website 3",
      url: "https://storied-gnome-e87320.netlify.app/",
      img: img4,
      translate: "group-hover:-translate-y-[500%]",
    },
  ];

  return (
    <section>
      <h1 className="text-center text-4xl font-semibold">
        Build by
        <br />
        React and Next.js
      </h1>
      <div className="mt-10 flex justify-center">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {websites.map((i, index) => (
            <Link
              key={index}
              href={i.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="group relative h-[400px] w-[350px] cursor-pointer overflow-hidden rounded-lg border-2 border-gray-300 shadow-lg">
                <div
                  className={`absolute inset-0 h-full w-full transition-transform duration-[5000ms] ease-in-out  group-hover:scale-105 ${i.translate}`}
                >
                  <Image
                    src={i.img}
                    alt={`Website ${index + 1}`}
                    className=""
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full border-2 border-blue-800 bg-blue-300 bg-opacity-30 p-5 duration-300 group-hover:bg-blue-700">
                    <OpenInNewIcon className="text-4xl font-thin text-blue-700 opacity-100 duration-300 group-hover:text-gray-50" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Develop;
