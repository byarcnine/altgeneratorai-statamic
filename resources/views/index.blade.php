@extends('statamic::layout')
@section('title', 'Alt Generator AI')

@push('head')
<style>
    .skeleton-pulse {
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 0.9;
        }

        50% {
            opacity: 0.5;
        }

        100% {
            opacity: 0.9;
        }
    }

    .nav-pagination nav div:first-child {
        display: none !important;
    }
</style>
@endpush

@section('content')
<div class="flex items-center justify-between mb-6">
    <h1>Alt Generator AI</h1>
</div>

<div class="card">
    <div class="p-4">
        <form id="generate-form">
            @csrf
            <table class="data-table mt-4">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="select-all"></th>
                        <th>Preview</th>
                        <th>Filename</th>
                        <th>Current Alt Text</th>
                        <th>Generated Alt Text</th>
                        <th>Approve</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($data ?? [] as $asset)
                    <tr>
                        <td><input type="checkbox" name="asset_ids[]" value="{{ $asset['id'] }}"></td>
                        <td>
                            <img src="{{ $asset['preview_url'] }}" alt="{{ $asset['current_alt'] }}" class="w-12 h-12 object-cover rounded">
                        </td>
                        <td>{{ $asset['filename'] }}</td>
                        <td>{{ $asset['current_alt'] }}</td>
                        <td class="generated-alt" data-asset-id="{{ $asset['id'] }}">
                            <div class="alt-text-content">{{ $asset['generated_alt'] ?? '' }}</div>
                            <div class="alt-text-skeleton hidden">
                                <div>
                                    <div class="h-3 bg-gray-300 rounded w-full mb-2 skeleton-pulse"></div>
                                    <div class="h-3 bg-gray-300 rounded w-5/6 mb-2 skeleton-pulse"></div>
                                    <div class="h-3 bg-gray-300 rounded w-4/6 skeleton-pulse"></div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <button type="button" class="btn-sm generate-btn btn-primary" disabled data-asset-id="{{ $asset['id'] }}">Generate</button>
                            <button type="button" class="btn-sm approve-btn btn-primary hidden" disabled data-asset-id="{{ $asset['id'] }}">Approve</button>
                            <span class="text-green-600 font-medium approved-label hidden" data-asset-id="{{ $asset['id'] }}">Approved</span>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            <div class="flex justify-end mt-4">
                <button type="submit" class="btn-primary">Generate Alt Text for Selected</button>
                <button id="bulk-approve-btn" class="btn-primary ml-2">Bulk Approve</button>
            </div>
        </form>

        @if($assets->hasPages())
        <div class="mt-4 flex items-center justify-center nav-pagination">
            {{ $assets->links() }}
        </div>
        @endif

        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Toggle select all checkboxes
                document.getElementById('select-all').addEventListener('change', function() {
                    const checkboxes = document.querySelectorAll('input[name="asset_ids[]"]');
                    checkboxes.forEach(checkbox => checkbox.checked = this.checked);
                });

                // Handle generate form submission via AJAX
                document.getElementById('generate-form').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const formData = new FormData(this);
                    const assetIds = formData.getAll('asset_ids[]');
                    if (assetIds.length === 0) {
                        alert('Please select at least one asset.');
                        return;
                    }

                    // Disable all selected generate buttons
                    assetIds.forEach(id => {
                        const generateBtn = document.querySelector(`.generate-btn[data-asset-id="${id}"]`);
                        if (generateBtn) {
                            generateBtn.disabled = true;
                        }
                    });

                    // Show loading skeletons for selected assets
                    assetIds.forEach(id => {
                        const cell = document.querySelector('.generated-alt[data-asset-id="' + id + '"]');
                        if (cell) {
                            cell.querySelector('.alt-text-content').classList.add('hidden');
                            cell.querySelector('.alt-text-skeleton').classList.remove('hidden');
                        }
                    });

                    fetch("{{ route('altgeneratorai.generate') }}", {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': "{{ csrf_token() }}",
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                asset_ids: assetIds,
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            const generated = data.generated;
                            for (const [id, text] of Object.entries(generated)) {
                                const cell = document.querySelector('.generated-alt[data-asset-id="' + id + '"]');
                                const approveBtn = document.querySelector('.approve-btn[data-asset-id="' + id + '"]');
                                const generateBtn = document.querySelector(`.generate-btn[data-asset-id="${id}"]`);

                                if (cell) {
                                    cell.querySelector('.alt-text-content').innerText = text;
                                    cell.querySelector('.alt-text-content').classList.remove('hidden');
                                    cell.querySelector('.alt-text-skeleton').classList.add('hidden');
                                }
                                if (approveBtn) {
                                    approveBtn.disabled = false;
                                    approveBtn.classList.remove('hidden');
                                }
                                if (generateBtn) {
                                    generateBtn.classList.add('hidden');
                                }
                            }
                        })
                        .catch(error => {
                            // Re-enable all generate buttons on error
                            assetIds.forEach(id => {
                                const generateBtn = document.querySelector(`.generate-btn[data-asset-id="${id}"]`);
                                const cell = document.querySelector('.generated-alt[data-asset-id="' + id + '"]');

                                if (generateBtn) {
                                    generateBtn.disabled = false;
                                }
                                if (cell) {
                                    cell.querySelector('.alt-text-skeleton').classList.add('hidden');
                                }
                            });
                            alert('An error occurred while generating the alt text. Please try again.');
                        });
                });

                // Handle single generate button clicks
                document.querySelectorAll('.generate-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const assetId = this.getAttribute('data-asset-id');
                        const cell = document.querySelector('.generated-alt[data-asset-id="' + assetId + '"]');
                        const approveBtn = document.querySelector('.approve-btn[data-asset-id="' + assetId + '"]');

                        // Disable the generate button while loading
                        this.disabled = true;

                        // Show loading skeleton
                        cell.querySelector('.alt-text-content').classList.add('hidden');
                        cell.querySelector('.alt-text-skeleton').classList.remove('hidden');

                        fetch("{{ route('altgeneratorai.generate') }}", {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': "{{ csrf_token() }}",
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                    asset_ids: [assetId],
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                const generated = data.generated[assetId];
                                if (cell) {
                                    cell.querySelector('.alt-text-content').innerText = generated;
                                    cell.querySelector('.alt-text-content').classList.remove('hidden');
                                    cell.querySelector('.alt-text-skeleton').classList.add('hidden');
                                }
                                if (approveBtn) {
                                    approveBtn.disabled = false;
                                    approveBtn.classList.remove('hidden');
                                    // Hide the generate button
                                    this.classList.add('hidden');
                                }
                            })
                            .catch(error => {
                                // Re-enable the generate button if there's an error
                                this.disabled = false;
                                // Hide the loading skeleton
                                cell.querySelector('.alt-text-skeleton').classList.add('hidden');
                                alert('An error occurred while generating the alt text. Please try again.');
                            });
                    });
                });

                // Enable generate buttons for assets that haven't been generated yet
                document.querySelectorAll('.generate-btn').forEach(btn => {
                    const assetId = btn.getAttribute('data-asset-id');
                    const cell = document.querySelector('.generated-alt[data-asset-id="' + assetId + '"]');
                    const altText = cell.querySelector('.alt-text-content').innerText;
                    const approveBtn = document.querySelector(`.approve-btn[data-asset-id="${assetId}"]`);

                    if (!altText) {
                        btn.disabled = false;
                        // Make sure approve button is hidden if there's no generated text
                        if (approveBtn) {
                            approveBtn.classList.add('hidden');
                        }
                    } else {
                        // If there's already generated text, hide the generate button
                        btn.classList.add('hidden');
                        // Show the approve button if it exists
                        if (approveBtn) {
                            approveBtn.classList.remove('hidden');
                            approveBtn.disabled = false;
                        }
                    }
                });

                // Approve a single asset's alt text
                document.querySelectorAll('.approve-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const assetId = this.getAttribute('data-asset-id');
                        const generatedAlt = document.querySelector('.generated-alt[data-asset-id="' + assetId + '"]').innerText;
                        approveAlt({
                            assetId: assetId,
                            newAlt: generatedAlt,
                        }, "Approved " + assetId);
                    });
                });

                // Handle bulk approval
                document.getElementById('bulk-approve-btn')?.addEventListener('click', function(e) {
                    e.preventDefault();
                    const approvals = {};
                    const selectedCheckboxes = document.querySelectorAll('input[name="asset_ids[]"]:checked');

                    if (selectedCheckboxes.length === 0) {
                        alert('Please select at least one asset to approve.');
                        return;
                    }

                    selectedCheckboxes.forEach(checkbox => {
                        const assetId = checkbox.value;
                        const cell = document.querySelector(`.generated-alt[data-asset-id="${assetId}"]`);
                        if (cell) {
                            approvals[assetId] = cell.querySelector('.alt-text-content').innerText;
                        }
                    });

                    approveAlt(approvals, "Approved " + Object.keys(approvals).length + " assets");
                });

                // Helper function to send approval data to the server
                function approveAlt(data, message) {
                    let payload = {};
                    if (data.assetId) {
                        payload.approvals = {};
                        payload.approvals[data.assetId] = data.newAlt;
                    } else {
                        payload.approvals = data;
                    }
                    fetch("{{ route('altgeneratorai.approve') }}", {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': "{{ csrf_token() }}"
                            },
                            body: JSON.stringify(payload)
                        })
                        .then(response => response.json())
                        .then(data => {
                            // Update UI for single approval
                            if (data.assetId) {
                                const approveBtn = document.querySelector(`.approve-btn[data-asset-id="${data.assetId}"]`);
                                const approvedLabel = document.querySelector(`.approved-label[data-asset-id="${data.assetId}"]`);
                                console.log(approveBtn, approvedLabel);
                                if (approveBtn) approveBtn.classList.add('hidden');
                                if (approvedLabel) approvedLabel.classList.remove('hidden');
                            } else {
                                // Update UI for bulk approval
                                Object.keys(payload.approvals).forEach(assetId => {
                                    const approveBtn = document.querySelector(`.approve-btn[data-asset-id="${assetId}"]`);
                                    const approvedLabel = document.querySelector(`.approved-label[data-asset-id="${assetId}"]`);
                                    console.log(approveBtn, approvedLabel);
                                    if (approveBtn) approveBtn.classList.add('hidden');
                                    if (approvedLabel) approvedLabel.classList.remove('hidden');
                                });
                            }
                            alert(message);
                        });
                }
            });
        </script>
    </div>
</div>
@endsection