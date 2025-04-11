<template>
    <div class="mt-4 flex items-center justify-center">
        <nav
            class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
        >
            <button
                v-if="currentPage > 1"
                @click="$emit('page-changed', currentPage - 1)"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
                Previous
            </button>

            <button
                v-for="page in pages"
                :key="page"
                @click="$emit('page-changed', page)"
                :class="[
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    page === currentPage
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                ]"
            >
                {{ page }}
            </button>

            <button
                v-if="currentPage < totalPages"
                @click="$emit('page-changed', currentPage + 1)"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
                Next
            </button>
        </nav>
    </div>
</template>

<script>
export default {
    name: "Pagination",
    props: {
        currentPage: {
            type: Number,
            required: true,
        },
        totalPages: {
            type: Number,
            required: true,
        },
    },
    computed: {
        pages() {
            const pages = [];
            const maxVisiblePages = 5;
            let startPage = Math.max(
                1,
                this.currentPage - Math.floor(maxVisiblePages / 2)
            );
            let endPage = Math.min(
                this.totalPages,
                startPage + maxVisiblePages - 1
            );

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            return pages;
        },
    },
};
</script>
