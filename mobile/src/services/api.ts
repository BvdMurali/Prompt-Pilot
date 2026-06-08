export interface ProcessPayload {
  text: string;
  action: 'optimize' | 'rewrite';
  tone?: string;
  length?: string;
  platform?: string;
}

export const processPromptApi = async (
  apiUrl: string,
  token: string | null,
  payload: ProcessPayload
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}/api/prompt/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server error occurred while processing prompt.');
  }

  return data;
};
