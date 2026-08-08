import React, { useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface Props {
  text: string;
  label?: string;
}

export const CopyDangerCodeAction: React.FC<Props> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (label) {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={handleCopy}
        startIcon={copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
        sx={{ textTransform: 'none' }}
      >
        {copied ? 'Copié !' : label}
      </Button>
    );
  }

  return (
    <Tooltip title={copied ? 'Copié !' : "Copier le code d'alerte"}>
      <IconButton size="small" onClick={handleCopy} sx={{ minWidth: 40, minHeight: 40 }}>
        {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};
