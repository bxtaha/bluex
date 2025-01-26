const Short = () => {
  const shortVideos = [
    {
      id: 1,
      title: "Travel Vlog",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 2,
      title: "Cooking Tips",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 3,
      title: "Tech Review",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 4,
      title: "Fitness Routine",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 5,
      title: "DIY Crafts",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 6,
      title: "Funny Moments",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 7,
      title: "Motivational Talk",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
    {
      id: 8,
      title: "Music Performance",
      url: "https://youtube.com/shorts/9gJLYq4GjdE?si=RamzW0ax3ql9-DMu",
    },
  ];

  // Function to convert Shorts URL to embeddable format
  const getEmbedUrl = (url: string) => {
    const videoId = url.split("/shorts/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {shortVideos.map((i) => {
          return (
            <div
              key={i.id}
              className="h-[500px] rounded-xl border-4 border-blue-500 text-white"
            >
              <iframe
                className="h-full w-full rounded-lg"
                src={getEmbedUrl(i.url)}
                title={i.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Short;
