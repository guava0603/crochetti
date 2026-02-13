<template>
  <div class="projects-section">
    <div v-if="projects && projects.length > 0" class="projects-grid">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        :copying="copyingProjectId === project.id"
        :show-delete="isMyPage"
        @open="(p) => emit('open', p)"
        @copy="(p) => emit('copy', p)"
        @share="(p) => emit('share', p)"
        @delete="(p) => emit('delete', p)"
      />
    </div>

    <router-link v-if="isMyPage" to="/add-project" class="add-project-link">
      + Add your project
    </router-link>

    <div v-if="!projects || projects.length === 0" class="no-projects">
      <p>No projects yet</p>
      <router-link v-if="isMyPage" to="/add-project" class="add-project-link">
        + Add your first project
      </router-link>
    </div>
  </div>
</template>

<script setup>
import ProjectCard from '@/components/projects/ProjectCard.vue'

defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  isMyPage: {
    type: Boolean,
    default: false
  },
  copyingProjectId: {
    type: [String, null],
    default: null
  }
})

const emit = defineEmits(['open', 'copy', 'share', 'delete'])
</script>

<style scoped>
.projects-section {
  background: white;
  border-radius: 0;
  padding: 2rem;
  margin: 0;
  box-shadow: none;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.no-projects {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.no-projects p {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

.add-project-link {
  display: inline-block;
  background: #42b983;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
}

.add-project-link:hover {
  background: #3aa876;
}
</style>
