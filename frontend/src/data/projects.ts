import project1 from "/images/project(1).jpg";
import project2 from "/images/project(2).jpg";
import project3 from "/images/project(3).jpg";
import project4 from "/images/project(4).jpg";

export type Project = {
  name: string;
  category: string;
  image: string;
};

export const projects: Project[] = [
  { name: "Makler Print", category: "Branding & Print", image: project1 },
  { name: "Finke", category: "Web & Digital", image: project2 },
  { name: "Schrämmer", category: "Marke & System", image: project3 },
  { name: "Triova", category: "Strategie & Design", image: project4 },
];
