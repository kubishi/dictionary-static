// This file is used by vite-plugin-ssg to generate static pages
import { getWords, getWordUrl } from '../services/data'

export async function generateWordRoutes() {
  // Load the words data
  const words = getWords()
  
  // Generate routes for all words
  return words.map(word => {
    const url = getWordUrl(word)
    return url.replace('/word/', '/word/')
  })
}
