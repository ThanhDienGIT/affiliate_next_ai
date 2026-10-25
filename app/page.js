import Shop from './Shop';
import { readCached, defaults } from '../lib/store';
import { publicProducts, publicCourses } from '../lib/clean';

export default async function Home() {
  const [products, courses, settings] = await Promise.all([readCached('products'), readCached('courses'), readCached('settings')]);
  return <Shop products={publicProducts(products)} courses={publicCourses(courses)} settings={{ ...defaults, ...settings }} />;
}
