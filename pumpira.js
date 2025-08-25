// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const addItemBtn = document.getElementById('add-item');
    const itemsContainer = document.getElementById('items-container');
    const preview = document.getElementById('invoice-preview');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportImageBtn = document.getElementById('export-image');
    const printInvoiceBtn = document.getElementById('print-invoice');
    const shareInvoiceBtn = document.getElementById('share-invoice');
    const clearDraftBtn = document.getElementById('clear-draft');
    const progressBar = document.getElementById('progress-bar');
    const templateButtons = document.querySelectorAll('#template-selector button');
    const logoInput = document.getElementById('logo-upload');
    const currencyInput = document.getElementById('currency');
    const currencyList = document.getElementById('currency-list');

    // Current template class
    let currentTemplate = 'template-minimalist';
    let logoDataUrl = ''; // Store logo base64
    let currencySymbol = '$'; // Default symbol

    // Fetch currencies and countries from API
    fetch('https://restcountries.com/v3.1/all?fields=name,currencies,cca3')
        .then(response => response.json())
        .then(data => {
            const currencyOptions = [];
            data.forEach(country => {
                if (country.currencies) {
                    Object.entries(country.currencies).forEach(([code, details]) => {
                        if (details.symbol && details.name) {
                            currencyOptions.push({
                                code: code,
                                symbol: details.symbol,
                                name: details.name,
                                country: country.name.common
                            });
                        }
                    });
                }
            });
            // Sort by code
            currencyOptions.sort((a, b) => a.code.localeCompare(b.code));
            // Populate datalist with value as symbol, label as full info
            currencyOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.symbol;
                option.textContent = `${opt.code} (${opt.symbol}) - ${opt.name} - ${opt.country}`;
                currencyList.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching currencies:', error);
            // Fallback to basic currencies
            const fallback = [
                {code: 'USD', symbol: '$', name: 'United States Dollar', country: 'United States'},
                {code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria'},
                {code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa'},
                {code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', country: 'Kenya'},
                {code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', country: 'Ghana'},
                {code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', country: 'Ethiopia'},
                {code: 'EUR', symbol: '€', name: 'Euro', country: 'Eurozone'},
                {code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom'},
                {code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan'}
            ];
            fallback.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.symbol;
                option.textContent = `${opt.code} (${opt.symbol}) - ${opt.name} - ${opt.country}`;
                currencyList.appendChild(option);
            });
        });

    // Update currency symbol on change
    currencyInput.addEventListener('input', () => {
        currencySymbol = currencyInput.value;
        updatePreview();
    });

    // Function to add a new item row (draggable)
    function addItemRow() {
        const row = document.createElement('div');
        row.classList.add('item-row');
        row.draggable = true; // Enable drag
        row.innerHTML = `
            <input type="text" placeholder="Item Description">
            <input type="number" placeholder="Quantity" min="1">
            <input type="number" placeholder="Price" min="0" step="0.01">
            <button class="remove-item">Remove <i class="fas fa-trash"></i></button>
        `;
        itemsContainer.appendChild(row);
        updatePreview();
        updateProgress();
        attachDragEvents(row); // Attach drag-drop events
    }

    // Event listener for adding item
    addItemBtn.addEventListener('click', addItemRow);

    // Event delegation for removing items
    itemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            e.target.closest('.item-row').remove();
            updatePreview();
            updateProgress();
        }
    });

    // Handle logo upload
    logoInput.addEventListener('change', () => {
        if (logoInput.files && logoInput.files[0]) {
            if (logoInput.files[0].size > 2 * 1024 * 1024) { // 2MB limit
                logoInput.value = '';
                logoDataUrl = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                logoDataUrl = e.target.result;
                updatePreview();
                saveDraft(); // Save logo with draft
            };
            reader.readAsDataURL(logoInput.files[0]);
        } else {
            logoDataUrl = '';
            updatePreview();
        }
    });

    // Function to save draft to LocalStorage
    function saveDraft() {
        const data = {
            businessName: document.getElementById('business-name').value,
            businessAddress: document.getElementById('business-address').value,
            businessEmail: document.getElementById('business-email').value,
            businessPhone: document.getElementById('business-phone').value,
            clientName: document.getElementById('client-name').value,
            clientAddress: document.getElementById('client-address').value,
            clientEmail: document.getElementById('client-email').value,
            invoiceNumber: document.getElementById('invoice-number').value,
            invoiceDate: document.getElementById('invoice-date').value,
            dueDate: document.getElementById('due-date').value,
            deliveryDate: document.getElementById('delivery-date').value,
            taxRate: document.getElementById('tax-rate').value,
            discount: document.getElementById('discount').value,
            currency: currencyInput.value,
            paymentStatus: document.getElementById('payment-status').value,
            paymentMethods: document.getElementById('payment-methods').value,
            notes: document.getElementById('notes').value,
            logo: logoDataUrl,
            items: Array.from(itemsContainer.querySelectorAll('.item-row')).map(row => ({
                desc: row.querySelector('input[placeholder="Item Description"]').value,
                qty: row.querySelector('input[placeholder="Quantity"]').value,
                price: row.querySelector('input[placeholder="Price"]').value
            }))
        };
        localStorage.setItem('proInvoiceDraft', JSON.stringify(data));
    }

    // Auto-save on input changes (debounced)
    let timeout;
    document.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(saveDraft, 2000); // Save after 2s of inactivity
    });

    // Load draft on page load
    window.addEventListener('load', () => {
        const data = JSON.parse(localStorage.getItem('proInvoiceDraft'));
        if (data) {
            document.getElementById('business-name').value = data.businessName || '';
            document.getElementById('business-address').value = data.businessAddress || '';
            document.getElementById('business-email').value = data.businessEmail || '';
            document.getElementById('business-phone').value = data.businessPhone || '';
            document.getElementById('client-name').value = data.clientName || '';
            document.getElementById('client-address').value = data.clientAddress || '';
            document.getElementById('client-email').value = data.clientEmail || '';
            document.getElementById('invoice-number').value = data.invoiceNumber || '';
            document.getElementById('invoice-date').value = data.invoiceDate || '';
            document.getElementById('due-date').value = data.dueDate || '';
            document.getElementById('delivery-date').value = data.deliveryDate || '';
            document.getElementById('tax-rate').value = data.taxRate || '';
            document.getElementById('discount').value = data.discount || '';
            currencyInput.value = data.currency || '$';
            currencySymbol = data.currency || '$';
            document.getElementById('payment-status').value = data.paymentStatus || 'Pending';
            document.getElementById('payment-methods').value = data.paymentMethods || '';
            document.getElementById('notes').value = data.notes || '';
            logoDataUrl = data.logo || '';
            itemsContainer.innerHTML = '';
            data.items.forEach(item => {
                addItemRow();
                const lastRow = itemsContainer.lastChild;
                lastRow.querySelector('input[placeholder="Item Description"]').value = item.desc;
                lastRow.querySelector('input[placeholder="Quantity"]').value = item.qty;
                lastRow.querySelector('input[placeholder="Price"]').value = item.price;
            });
            updatePreview();
            updateProgress();
        } else {
            addItemRow(); // Initial item for new users
        }
    });

    // Clear draft with confirmation
    clearDraftBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the draft?')) {
            localStorage.removeItem('proInvoiceDraft');
            document.querySelectorAll('input, textarea, select').forEach(input => input.value = '');
            logoInput.value = '';
            logoDataUrl = '';
            currencyInput.value = '';
            currencySymbol = '$';
            itemsContainer.innerHTML = '';
            addItemRow();
            updatePreview();
            updateProgress();
        }
    });

    // Function to update the live preview
    function updatePreview() {
        try {
            // Gather data
            const businessName = document.getElementById('business-name').value || 'Your Business';
            const businessAddress = document.getElementById('business-address').value || '';
            const businessEmail = document.getElementById('business-email').value || '';
            const businessPhone = document.getElementById('business-phone').value || '';
            const clientName = document.getElementById('client-name').value || 'Client';
            const clientAddress = document.getElementById('client-address').value || '';
            const clientEmail = document.getElementById('client-email').value || '';
            const invoiceNumber = document.getElementById('invoice-number').value || 'INV-001';
            const invoiceDate = document.getElementById('invoice-date').value || new Date().toLocaleDateString();
            const dueDate = document.getElementById('due-date').value || '';
            const deliveryDate = document.getElementById('delivery-date').value || '';
            const paymentStatus = document.getElementById('payment-status').value || 'Pending';
            const paymentMethods = document.getElementById('payment-methods').value || '';
            const notes = document.getElementById('notes').value || '';

            // Logo
            let logoHtml = logoDataUrl ? `<img src="${logoDataUrl}" class="logo">` : '';

            // Items and calculations
            let subtotal = 0;
            let itemsHtml = `
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            const rows = itemsContainer.querySelectorAll('.item-row');
            rows.forEach(row => {
                const desc = row.querySelector('input[placeholder="Item Description"]').value || 'Item';
                const qty = parseFloat(row.querySelector('input[placeholder="Quantity"]').value) || 0;
                const price = parseFloat(row.querySelector('input[placeholder="Price"]').value) || 0;
                if (qty < 0 || price < 0) {
                    return;
                }
                const itemSubtotal = qty * price;
                subtotal += itemSubtotal;
                itemsHtml += `
                    <tr>
                        <td>${desc}</td>
                        <td>${qty}</td>
                        <td>${currencySymbol}${price.toFixed(2)}</td>
                        <td>${currencySymbol}${itemSubtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
            itemsHtml += '</tbody></table>';

            const taxRate = parseFloat(document.getElementById('tax-rate').value) / 100 || 0;
            const discount = parseFloat(document.getElementById('discount').value) / 100 || 0;
            const tax = subtotal * taxRate;
            const grandTotal = (subtotal + tax) * (1 - discount);

            // Build preview HTML
            let html = `
                <div class="header">
                    ${logoHtml}
                    <h2 class="business-name">${businessName}</h2>
                </div>
                <h3>Invoice #${invoiceNumber}</h3>
                <p><strong>Status:</strong> ${paymentStatus}</p>
                <div class="section">
                    <p><strong>From:</strong> ${businessName}<br>${businessAddress}<br>${businessEmail}<br>${businessPhone}</p>
                </div>
                <div class="section">
                    <p><strong>To:</strong> ${clientName}<br>${clientAddress}<br>${clientEmail}</p>
                </div>
                <div class="section">
                    <p><strong>Date:</strong> ${invoiceDate}</p>
                    <p><strong>Due:</strong> ${dueDate}</p>
                    <p><strong>Delivery/Shipment:</strong> ${deliveryDate}</p>
                </div>
                ${itemsHtml}
                <div class="totals">
                    <p>Subtotal: ${currencySymbol}${subtotal.toFixed(2)}</p>
                    <p>Tax (${(taxRate * 100).toFixed(0)}%): ${currencySymbol}${tax.toFixed(2)}</p>
                    <p>Discount (${(discount * 100).toFixed(0)}%): -${currencySymbol}${((subtotal + tax) * discount).toFixed(2)}</p>
                    <p>Grand Total: ${currencySymbol}${grandTotal.toFixed(2)}</p>
                </div>
            `;
            if (paymentMethods) {
                html += `<div class="payment-methods"><p><strong>Accepted Payment Methods:</strong> ${paymentMethods}</p></div>`;
            }
            if (notes) {
                html += `<div class="notes"><p><strong>Notes:</strong> ${notes}</p></div>`;
            }
            preview.innerHTML = html;
            preview.className = currentTemplate; // Apply current template
        } catch (error) {
            console.error('Error updating preview:', error);
            preview.innerHTML = '<p>Error generating preview. Check inputs.</p>';
        }
    }

    // Update progress bar (gamification: ~12.5% per section completed)
    function updateProgress() {
        const totalSections = 8; // Business, client, invoice number, items, tax/discount, logo, delivery, payment methods, notes
        let completed = 0;
        if (document.getElementById('business-name').value) completed++;
        if (document.getElementById('client-name').value) completed++;
        if (document.getElementById('invoice-number').value) completed++;
        if (itemsContainer.children.length > 0) completed++;
        if (document.getElementById('tax-rate').value || document.getElementById('discount').value) completed++;
        if (logoDataUrl) completed++;
        if (document.getElementById('delivery-date').value) completed++;
        if (document.getElementById('payment-methods').value) completed++;
        if (document.getElementById('notes').value) completed++;
        const progress = (completed / totalSections) * 100;
        progressBar.style.setProperty('--width', `${progress}%`);
    }

    // Real-time update on any input change
    document.addEventListener('input', updatePreview);

    // Template switching
    templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTemplate = `template-${btn.dataset.template}`;
            updatePreview();
        });
    });

    // Drag-drop for items
    function attachDragEvents(row) {
        row.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', '');
            row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => row.classList.remove('dragging'));
    }

    itemsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(itemsContainer, e.clientY);
        if (afterElement == null) {
            itemsContainer.appendChild(dragging);
        } else {
            itemsContainer.insertBefore(dragging, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.item-row:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Export to PDF with fix for cutoff
    exportPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const originalOverflow = preview.style.overflow;
        const originalHeight = preview.style.height;
        preview.style.overflow = 'visible';
        preview.style.height = `${preview.scrollHeight}px`;
        html2canvas(preview, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const margin = 10;
            const pdfWidth = doc.internal.pageSize.getWidth() - 2 * margin;
            const pdfPageHeight = doc.internal.pageSize.getHeight() - 2 * margin;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            const pages = Math.ceil(imgHeight / pdfPageHeight);
            const canvasPageHeight = (pdfPageHeight / imgHeight) * canvas.height;
            for (let i = 0; i < pages; i++) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = Math.min(canvasPageHeight, canvas.height - i * canvasPageHeight);
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, i * canvasPageHeight, canvas.width, tempCanvas.height, 0, 0, canvas.width, tempCanvas.height);
                const tempData = tempCanvas.toDataURL('image/png');
                if (i > 0) doc.addPage();
                doc.addImage(tempData, 'PNG', margin, margin, pdfWidth, (tempCanvas.height * pdfWidth) / tempCanvas.width);
            }
            doc.save(`invoice_${document.getElementById('invoice-number').value || '001'}.pdf`);
        }).catch(error => {
            console.error('PDF export error:', error);
        }).finally(() => {
            preview.style.overflow = originalOverflow;
            preview.style.height = originalHeight;
        });
    });

    // Export to Image (PNG) with full capture
    exportImageBtn.addEventListener('click', () => {
        const originalOverflow = preview.style.overflow;
        const originalHeight = preview.style.height;
        preview.style.overflow = 'visible';
        preview.style.height = `${preview.scrollHeight}px`;
        html2canvas(preview, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `invoice_${document.getElementById('invoice-number').value || '001'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(error => {
            console.error('Image export error:', error);
        }).finally(() => {
            preview.style.overflow = originalOverflow;
            preview.style.height = originalHeight;
        });
    });

    // Print invoice
    printInvoiceBtn.addEventListener('click', () => {
        window.print();
    });

    // Share via Email
    shareInvoiceBtn.addEventListener('click', () => {
        const clientEmail = document.getElementById('client-email').value;
        const invoiceNumber = document.getElementById('invoice-number').value || '001';
        const subject = encodeURIComponent(`Invoice #${invoiceNumber} from ${document.getElementById('business-name').value || 'Your Business'}`);
        const body = encodeURIComponent(`Dear ${document.getElementById('client-name').value || 'Client'},\n\nPlease find your invoice attached. Thank you for your business!\n\nBest,\n${document.getElementById('business-name').value || 'Your Business'}`);
        const mailto = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
        window.location.href = mailto;
    });
});
