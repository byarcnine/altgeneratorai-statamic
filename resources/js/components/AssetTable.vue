<template>
    <div>
        <form @submit.prevent="handleSubmit">
            <table class="data-table mt-4">
                <thead>
                    <tr>
                        <th><input type="checkbox" v-model="selectAll" /></th>
                        <th>Preview</th>
                        <th>Filename</th>
                        <th>Current Alt Text</th>
                        <th>Generated Alt Text</th>
                        <th>Approve</th>
                    </tr>
                </thead>
                <tbody>
                    <asset-row
                        v-for="asset in assets"
                        :key="asset.id"
                        :asset="asset"
                        :selected="selectedAssets.includes(asset.id)"
                        :is-generating="generatingAssetIds.includes(asset.id)"
                        @select="toggleAssetSelection"
                        @generate="handleGenerate"
                        @approve="handleApprove"
                    />
                </tbody>
            </table>
            <div class="flex justify-end mt-4">
                <button type="submit" class="btn-primary" :disabled="isLoading">
                    <span
                        v-if="isLoading"
                        class="spinner inline-block mr-2"
                    ></span>
                    Generate Alt Text for Selected
                </button>
                <button
                    type="button"
                    class="btn-primary ml-2"
                    @click="handleBulkApprove"
                    :disabled="isLoading"
                >
                    Bulk Approve
                </button>
            </div>
        </form>

        <pagination
            v-if="totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            @page-changed="$emit('page-changed', $event)"
        />
    </div>
</template>

<script>
import AssetRow from "./AssetRow.vue";
import Pagination from "./Pagination.vue";

export default {
    name: "AssetTable",
    components: {
        AssetRow,
        Pagination,
    },
    props: {
        assets: {
            type: Array,
            required: true,
        },
        currentPage: {
            type: Number,
            required: true,
        },
        totalPages: {
            type: Number,
            required: true,
        },
    },
    data() {
        return {
            selectedAssets: [],
            isLoading: false,
            generatingAssetIds: [],
        };
    },
    computed: {
        selectAll: {
            get() {
                return (
                    this.assets.length > 0 &&
                    this.selectedAssets.length === this.assets.length
                );
            },
            set(value) {
                this.selectedAssets = value
                    ? this.assets.map((asset) => asset.id)
                    : [];
            },
        },
    },
    methods: {
        toggleAssetSelection(assetId) {
            const index = this.selectedAssets.indexOf(assetId);
            if (index === -1) {
                this.selectedAssets.push(assetId);
            } else {
                this.selectedAssets.splice(index, 1);
            }
        },
        handleSubmit() {
            if (this.selectedAssets.length === 0) {
                alert("Please select at least one asset.");
                return;
            }
            this.isLoading = true;
            this.generatingAssetIds = [...this.selectedAssets];
            this.$emit("generate", this.selectedAssets);
        },
        handleGenerate(assetId) {
            this.isLoading = true;
            this.generatingAssetIds = [...this.generatingAssetIds, assetId];
            this.$emit("generate", [assetId]);
        },
        handleApprove({ assetId, newAlt }) {
            this.$emit("approve", { assetId, newAlt });
        },
        handleBulkApprove() {
            if (this.selectedAssets.length === 0) {
                alert("Please select at least one asset to approve.");
                return;
            }

            const approvals = {};
            this.selectedAssets.forEach((assetId) => {
                const asset = this.assets.find((a) => a.id === assetId);
                if (asset && asset.generated_alt) {
                    approvals[assetId] = asset.generated_alt;
                }
            });

            if (Object.keys(approvals).length === 0) {
                alert("No generated alt text found for selected assets.");
                return;
            }

            this.$emit("bulk-approve", approvals);
        },
        generationComplete(assetIds) {
            this.isLoading = false;
            this.generatingAssetIds = this.generatingAssetIds.filter(
                (id) => !assetIds.includes(id)
            );
        },
    },
};
</script>

<style scoped>
.spinner {
    width: 1em;
    height: 1em;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
