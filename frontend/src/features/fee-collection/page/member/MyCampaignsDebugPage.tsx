import React, { useState, useEffect } from 'react';
import { usePaymentAssignments } from '../../../../shared/hooks/usePaymentAssignments';

export const MyCampaignsDebugPage: React.FC = () => {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { getUserAssignments } = usePaymentAssignments();

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Debug: Starting to fetch assignments...');
                const result = await getUserAssignments();
                console.log('Debug: Raw API result:', result);
                console.log('Debug: Result type:', typeof result);
                console.log('Debug: Is array:', Array.isArray(result));
                console.log('Debug: Result length:', result?.length);

                setAssignments(result || []);
                console.log('Debug: Assignments set in state');
            } catch (error) {
                console.error('Debug: Error fetching assignments:', error);
            } finally {
                setLoading(false);
                console.log('Debug: Loading set to false');
            }
        };

        fetchData();
    }, [getUserAssignments]);

    console.log('Debug: Render - assignments:', assignments);
    console.log('Debug: Render - loading:', loading);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-doan-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Debug My Campaigns Page</h1>
            <p>Total assignments: {assignments.length}</p>

            {assignments.length === 0 ? (
                <div>No assignments found</div>
            ) : (
                <div>
                    {assignments.map((assignment, index) => (
                        <div key={assignment.id || index} style={{
                            border: '1px solid #ccc',
                            margin: '10px 0',
                            padding: '10px'
                        }}>
                            <h3>Assignment {index + 1}</h3>
                            <p><strong>ID:</strong> {assignment.id}</p>
                            <p><strong>Status:</strong> {assignment.status}</p>
                            <p><strong>Campaign:</strong> {assignment.campaign?.name}</p>
                            <p><strong>Campaign Status:</strong> {assignment.campaign?.status}</p>
                            <p><strong>Organization:</strong> {assignment.campaign?.organization?.name}</p>
                            <p><strong>Amount:</strong> {assignment.feeLevel?.amount}</p>
                            <details>
                                <summary>Full Assignment Data</summary>
                                <pre>{JSON.stringify(assignment, null, 2)}</pre>
                            </details>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyCampaignsDebugPage;
