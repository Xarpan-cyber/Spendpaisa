document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transaction-form');
    const typeSelect = document.getElementById('transaction-type');
    const desc = document.getElementById('description');
    const amount = document.getElementById('amount');
    const date = document.getElementById('date');
    const transactionList = document.getElementById('transaction-list');
    const noTransactions = document.getElementById('no-transactions');
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expensesEl = document.getElementById('total-expenses');
    const remainingEl = document.getElementById('remaining-balance');
    const totalTxnsEl = document.getElementById('total-transactions');



    function getTransactions() {
        return JSON.parse(localStorage.getItem('transactions') || '[]');
    }

    function saveTransactions(txns) {
        localStorage.setItem('transactions', JSON.stringify(txns));
    }

    function formatCurrency(value) {
        return '₹' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateSummary() {
        const txns = getTransactions();
        const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const balance = income - expenses;
        balanceEl.textContent = formatCurrency(balance);
        incomeEl.textContent = formatCurrency(income);
        expensesEl.textContent = formatCurrency(expenses);
        remainingEl.textContent = formatCurrency(balance);

        if (totalTxnsEl) {
            totalTxnsEl.textContent = txns.length;
        }
    }

    function renderTransactions() {
        const txns = getTransactions();
        transactionList.querySelectorAll('.transaction').forEach(n => n.remove());
        if (!txns || txns.length === 0) {
            if (noTransactions) noTransactions.style.display = 'block';
            return;
        }
        if (noTransactions) noTransactions.style.display = 'none';
        txns.slice().reverse().forEach(t => {
            const el = document.createElement('div');
            el.className = 'transaction';

            const title = document.createElement('div');
            title.className = 'col-desc font-medium';
            title.textContent = t.description;

            const dt = document.createElement('div');
            dt.className = 'col-date text-gray';
            dt.textContent = new Date(t.date).toLocaleDateString();

            const amt = document.createElement('div');
            amt.className = 'col-amount font-medium';
            amt.textContent = (t.type === 'income' ? '+ ' : '- ') + formatCurrency(t.amount);
            amt.style.color = t.type === 'income' ? '#10b981' : '#ef4444';

            const delWrap = document.createElement('div');
            delWrap.className = 'col-action';
            const del = document.createElement('button');
            del.textContent = 'Delete';
            del.className = 'btn-delete';
            del.dataset.id = t.id;
            del.addEventListener('click', () => deleteTransaction(t.id));
            delWrap.appendChild(del);

            el.appendChild(title);
            el.appendChild(dt);
            el.appendChild(amt);
            el.appendChild(delWrap);

            transactionList.appendChild(el);
        });
        updateSummary();
    }

    function addTransaction(tx) {
        const txns = getTransactions();
        txns.push(tx);
        saveTransactions(txns);
        renderTransactions();
    }

    function deleteTransaction(id) {
        const txns = getTransactions().filter(t => t.id !== id);
        saveTransactions(txns);
        renderTransactions();
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const type = typeSelect.value;
        const description = desc.value.trim();
        const amt = Number(amount.value);
        const dt = date.value;
        if (!description || !dt || isNaN(amt) || amt <= 0) {
            alert('Please enter a valid description, date, and amount greater than 0.');
            return;
        }
        const tx = {
            id: Date.now().toString(),
            type,
            description,
            amount: amt,
            date: dt
        };
        addTransaction(tx);
        form.reset();
        date.value = new Date().toISOString().slice(0, 10);
    });

    if (!localStorage.getItem('transactions')) saveTransactions([]);
    renderTransactions();
});
