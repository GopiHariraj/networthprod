"use client";

import React, { useState, useEffect } from 'react';
import { financialDataApi } from '../../lib/api/financial-data';
import { useCurrency } from '../../lib/currency-context';

interface ToDoItem {
    id: string;
    type: 'TASK' | 'REMINDER' | 'NOTE';
    title: string;
    description?: string;
    isCompleted: boolean;
    dueDate?: string;
    reminderTime?: string;
    linkedEntityType?: string;
    linkedEntityId?: string;
    createdAt: string;
}

export default function TodoPage() {
    const { currency } = useCurrency();
    const [activeTab, setActiveTab] = useState<'TASK' | 'REMINDER' | 'NOTE'>('TASK');
    const [items, setItems] = useState<ToDoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        dueDate: '',
        reminderTime: '',
        linkedEntityType: '',
        linkedEntityId: ''
    });

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const response = await financialDataApi.todo.getAll(activeTab);
            setItems(response.data);
        } catch (error) {
            console.error('Failed to fetch items', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = {
                type: activeTab,
                title: form.title,
                description: form.description,
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
                reminderTime: form.reminderTime ? new Date(form.reminderTime).toISOString() : null,
                linkedEntityType: form.linkedEntityType || null,
                linkedEntityId: form.linkedEntityId || null
            };

            if (editingId) {
                await financialDataApi.todo.update(editingId, data);
                alert('✅ Item updated successfully!');
            } else {
                await financialDataApi.todo.create(data);
                alert('🚀 Item added successfully!');
            }
            fetchItems();
            resetForm();
        } catch (error) {
            alert('Failed to save item. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item: ToDoItem) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            description: item.description || '',
            dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
            reminderTime: item.reminderTime ? item.reminderTime.slice(0, 16) : '',
            linkedEntityType: item.linkedEntityType || '',
            linkedEntityId: item.linkedEntityId || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await financialDataApi.todo.delete(id);
            fetchItems();
        }
    };

    const handleToggleComplete = async (item: ToDoItem) => {
        try {
            await financialDataApi.todo.update(item.id, { isCompleted: !item.isCompleted });
            fetchItems();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            title: '',
            description: '',
            dueDate: '',
            reminderTime: '',
            linkedEntityType: '',
            linkedEntityId: ''
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 text-slate-900 dark:text-white">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 flex flex-wrap justify-between items-end gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">📝 To-Do & Reminders</h1>
                        <p className="text-slate-500 mt-2 text-lg">Manage your tasks, reminders, and notes</p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        {(['TASK', 'REMINDER', 'NOTE'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {tab === 'TASK' ? '✅ Tasks' : tab === 'REMINDER' ? '⏰ Reminders' : '📌 Notes'}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 sticky top-8">
                            <h3 className="font-bold text-xl mb-6">{editingId ? '✏️ Edit Item' : `➕ Add ${activeTab === 'TASK' ? 'Task' : activeTab === 'REMINDER' ? 'Reminder' : 'Note'}`}</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Title</label>
                                    <input
                                        placeholder={`e.g., ${activeTab === 'TASK' ? 'Review budget' : activeTab === 'REMINDER' ? 'Pay credit card' : 'Meeting notes'}`}
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Description</label>
                                    <textarea
                                        placeholder="Add details..."
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none"
                                    />
                                </div>

                                {(activeTab === 'TASK' || activeTab === 'REMINDER') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Due Date</label>
                                        <input
                                            type="date"
                                            value={form.dueDate}
                                            onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}

                                {activeTab === 'REMINDER' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Reminder Time</label>
                                        <input
                                            type="datetime-local"
                                            value={form.reminderTime}
                                            onChange={e => setForm({ ...form, reminderTime: e.target.value })}
                                            required={activeTab === 'REMINDER'}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-black transition-all"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all"
                                    >
                                        {isSubmitting ? 'Saving...' : (editingId ? '💾 Update' : 'Add Item')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-slate-500">Loading...</div>
                        ) : items.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                                No {activeTab.toLowerCase()}s found. Add one to get started!
                            </div>
                        ) : (
                            items.map(item => (
                                <div key={item.id} className={`bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex justify-between items-start group hover:shadow-lg transition-all ${item.isCompleted ? 'opacity-60' : ''}`}>
                                    <div className="flex items-start gap-4 flex-1">
                                        {(activeTab === 'TASK' || activeTab === 'REMINDER') && (
                                            <button
                                                onClick={() => handleToggleComplete(item)}
                                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}
                                            >
                                                {item.isCompleted && '✓'}
                                            </button>
                                        )}
                                        <div>
                                            <h3 className={`text-lg font-bold ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{item.title}</h3>
                                            {item.description && <p className="text-slate-500 mt-1 whitespace-pre-wrap">{item.description}</p>}

                                            <div className="flex flex-wrap gap-4 mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                                {item.dueDate && (
                                                    <span className="flex items-center gap-1">
                                                        📅 Due: {new Date(item.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {item.reminderTime && (
                                                    <span className="flex items-center gap-1 text-orange-500">
                                                        🔔 {new Date(item.reminderTime).toLocaleString()}
                                                    </span>
                                                )}
                                                {item.linkedEntityType && (
                                                    <span className="flex items-center gap-1 text-blue-500">
                                                        🔗 {item.linkedEntityType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
