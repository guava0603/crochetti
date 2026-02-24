<template>
  <div class="projects-section">
    <div v-if="projects && projects.length > 0" class="projects-grid">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        :copying="copyingProjectId === project.id"
        :show-copy="isMyPage"
        :show-copy-link="!isMyPage"
        :show-share="isMyPage"
        :show-delete="isMyPage"
        @open="(p) => emit('open', p)"
        @copy="(p) => emit('copy', p)"
        @share="(p) => emit('share', p)"
        @delete="(p) => emit('delete', p)"
      />
    </div>

    <div v-if="!projects || projects.length === 0" class="no-projects">
      <p>No projects yet</p>
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
  display: flex;
  flex: 1;
  background: white;
  border-radius: 0;
  padding: 2rem;
  margin: 0;
  box-shadow: none;
}

.projects-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
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
