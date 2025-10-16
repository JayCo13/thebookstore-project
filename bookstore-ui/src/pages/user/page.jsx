import FeaturedBooks from './components/home/FeaturedBooks';
import GenreCategories from './components/home/GenreCategories';
import BookCollection from './components/home/BookCollection';
import HeroSection from './components/home/HeroSection';

export default function HomePage() {
  return (
    <div className="pt-20">
      <HeroSection />
      <FeaturedBooks />
      <GenreCategories />
      <BookCollection />
    </div>
  );
}