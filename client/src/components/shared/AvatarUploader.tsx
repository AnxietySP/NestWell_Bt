import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function AvatarUploader() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelChange = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', pendingFile);
      await api.patch('/auth/me/avatar', formData);
      await refreshUser();
      handleCancelChange();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Failed to update profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/12 text-xs font-semibold text-primary"
          title="Change profile picture"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{(user?.fullName || 'U').charAt(0).toUpperCase()}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-medium text-fg-muted hover:text-primary transition-colors"
        >
          Change Profile Picture
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFilePicked}
          className="hidden"
        />
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingFile)}
        onClose={handleCancelChange}
        title="Change Profile Picture"
        subtitle="Are you sure you want to change your profile picture?"
      >
        <div className="space-y-4">
          {previewUrl && (
            <div className="flex justify-center py-2">
              <img
                src={previewUrl}
                alt="New profile preview"
                className="h-24 w-24 rounded-full object-cover border border-border shadow-soft"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelChange}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              isLoading={uploading}
            >
              Yes, Change Picture
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}