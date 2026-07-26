
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default async function allCategories() {
    try {
        const response = await fetch(`${BASE_URL}/api/taxonomy`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}