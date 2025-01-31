import React, { useState, useEffect, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import Header from '@/components/exhibComp/Header';
import Hero from '@/components/exhibComp/Hero';
import SubmitButtonSection from '@/components/exhibComp/SubmitButtonSection';
import Projectshowcase from '@/components/exhibComp/ProjectShowcase';
import FeaturedProject from '@/components/exhibComp/FeaturedProject';
import SubmitProjectModal from '@/components/exhibComp/SubmitProjectModal';
import Footer from '@/components/exhibComp/Footer';
import { demoProjects, featuredProject, categories } from '@/components/exhibComp/data';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ExhibPro() {
  const [projects, setProjects] = useState(demoProjects)
  const [showFeatured, setShowFeatured] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentFilter, setCurrentFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const projectSubmissionDate = new Date()
    projectSubmissionDate.setDate(projectSubmissionDate.getDate() - 20)
    const currentDate = new Date()
    const daysSinceSubmission = differenceInDays(currentDate, projectSubmissionDate)
    setShowFeatured(daysSinceSubmission >= 20)
  }, [])

  // Fetch projects from Firestore on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedProjects = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  // Use useMemo to optimize filtering and searching
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesFilter = currentFilter === "All" || project.category.includes(currentFilter)
      const matchesSearch = searchTerm === "" ||
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.technologies.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesFilter && matchesSearch
    })
  }, [currentFilter, searchTerm, projects])

  const handleFilterChange = (category) => {
    setCurrentFilter(category)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
  }

  // Modified handleSubmitProject to store in Firestore
  const handleSubmitProject = async (projectData) => {
    try {
      const newProject = {
        title: projectData.name,
        description: projectData.description,
        image: projectData.image || '/api/placeholder/400/300',
        category: projectData.category || ['Web Development'],
        technologies: projectData.technologies || ['React'],
        githubUrl: projectData.github,
        linkedinUrl: projectData.linkedin,
        owner: projectData.owner || 'Anonymous',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'projects'), newProject);
      
      setProjects(prevProjects => [{
        id: docRef.id,
        ...newProject
      }, ...prevProjects]);
      
    } catch (error) {
      console.error('Error adding project:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        categories={categories}
        currentFilter={currentFilter}
      />
      <Hero />
      <SubmitButtonSection onSubmitProject={() => setIsModalOpen(true)} />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          {showFeatured && <FeaturedProject project={featuredProject} />}
          {filteredProjects.length === 0 ? (
            <p className="text-center text-xl mt-8">No projects found matching your criteria.</p>
          ) : (
            <Projectshowcase projects={filteredProjects} itemsPerPage={4} />
          )}
        </div>
      </main>
      <Footer />
      <SubmitProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitProject}
      />
    </div>
  );
}