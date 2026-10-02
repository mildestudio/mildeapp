<script lang="ts">
  import type { PageProps } from './$types';
  import ScenePreview from '$lib/spatial/ScenePreview.svelte';
  let { params }: PageProps = $props();
</script>

<ScenePreview sceneId={params.id} />
