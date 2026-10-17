import project1 from "/images/project(1).jpg";
import project2 from "/images/project(2).jpg";
import project3 from "/images/project(3).jpg";
import project4 from "/images/project(4).jpg";

export type Project = {
  name: string;
  category: string;
  description: string;
  image: string;
};

export const projects: Project[] = [
  {
    name: "Makler Print",
    category: "Branding & Print",
    description:
      "Ein prägnantes Erscheinungsbild für ein Maklerbüro – von der Logoführung über die Geschäftsausstattung bis zu hochwertigen Printmaterialien.",
    image: project1,
  },
  {
    name: "Finke",
    category: "Web & Digital",
    description:
      "Eine moderne Website mit klarer Nutzerführung, die das Unternehmen digital sichtbar macht und Anfragen nachhaltig steigert.",
    image: project2,
  },
  {
    name: "Schrämmer",
    category: "Marke & System",
    description:
      "Ein durchgängiges Markensystem mit einheitlichen Designrichtlinien für alle Kanäle – konsistent, flexibel und skalierbar.",
    image: project3,
  },
  {
    name: "Triova",
    category: "Strategie & Design",
    description:
      "Von der Marktanalyse zur visuellen Identität: eine ganzheitliche Strategie mit einem Design, das Vertrauen schafft.",
    image: project4,
  },
];
