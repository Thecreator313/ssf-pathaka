/**
 * SSF Membership Studio - Export & WhatsApp Share Handler
 */

export const Exporter = {
  /**
   * Download Canvas as HD PNG file
   */
  async downloadHD(canvas, unitName = 'Unit') {
    const filename = `SSF_Membership_2026_${unitName.replace(/\s+/g, '_')}.png`;
    
    // Check canvas to Blob
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }, 'image/png', 1.0);
    } else {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * Generate Campaign Caption Text
   */
  generateCaption(unitName, studentCentre) {
    const unit = unitName || 'SSF Unit';
    const centre = studentCentre || 'Student Centre';
    
    return `അതെ, ഞാനും അംഗമായി! 💚 SSF MEMBERSHIP 2026\n\n📌 Unit: ${unit}\n🏢 Student Centre: ${centre}\n\n#SSFMembership2026 #SSFMalappuram #IMIn #SSFMappings`;
  },

  /**
   * Share frame to WhatsApp or Web Share API
   */
  async shareToWhatsApp(canvas, config) {
    const caption = this.generateCaption(config.unitName, config.studentCentre);

    // Try Web Share API with image file if browser supports it
    if (navigator.canShare && canvas.toBlob) {
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
        const file = new File([blob], `SSF_Membership_2026_${(config.unitName || 'Frame').replace(/\s+/g, '_')}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'SSF Membership 2026 Frame',
            text: caption,
            files: [file]
          });
          return { success: true, method: 'web-share' };
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Web share failed, resorting to WhatsApp web/app link fallback', err);
        } else {
          return { success: false, cancelled: true };
        }
      }
    }

    // Fallback: Download image & open WhatsApp web/app intent with caption
    await this.downloadHD(canvas, config.unitName);

    const encodedText = encodeURIComponent(caption);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');

    return {
      success: true,
      method: 'whatsapp-fallback',
      message: 'Image downloaded! WhatsApp opened with campaign text.'
    };
  },

  /**
   * Copy caption to clipboard
   */
  async copyCaption(unitName, studentCentre) {
    const caption = this.generateCaption(unitName, studentCentre);
    try {
      await navigator.clipboard.writeText(caption);
      return true;
    } catch (e) {
      // Fallback input textarea
      const textInput = document.createElement('textarea');
      textInput.value = caption;
      document.body.appendChild(textInput);
      textInput.select();
      document.execCommand('copy');
      document.body.removeChild(textInput);
      return true;
    }
  }
};
