import FeaturedBooks from './components/home/FeaturedBooks';
import BookCollection from './components/home/BookCollection';
import HeroSection from './components/home/HeroSection';
import YogaShowcase from './components/home/YogaShowcase';
import StationeryShowcase from './components/home/StationeryShowcase';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <FeaturedBooks />
      <YogaShowcase />
      <StationeryShowcase />
      <BookCollection />
    </div>
  );
}