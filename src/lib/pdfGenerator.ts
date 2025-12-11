import { jsPDF } from "jspdf";

import { formatPausedMonth } from "@/lib/dueCalculation";

export type ReceiptData = {
  studentName: string;
  studentId: string;
  monthlyFee: number;
  pendingMonths: string[];
  totalDue: number;
  joiningDate: string;
  subject?: string | null;
  profilePhotoUrl?: string | null;
  pausedMonths?: string[];
};

export const generateReceipt = async (data: ReceiptData) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set up colors
  const primaryColor = [59, 130, 246]; // Blue
  const textColor = [31, 41, 55]; // Dark gray

  // Header with border
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, 210, 40, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("FEE RECEIPT", 105, 20, { align: "center" });
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("TeachEase Dashboard", 105, 30, { align: "center" });

  // Top-left: Student photo (if available)
  let photoYOffset = 0;
  
  try {
    const photoImg = new Image();
    photoImg.crossOrigin = "anonymous";
    photoImg.src = data.profilePhotoUrl || "/default_avatar.jpg"; // <-- updated to .jpg
  
    await new Promise((resolve) => {
      photoImg.onload = () => {
        try {
          const photoX = 20;
          const photoY = 50;
          const photoSize = 30;
  
          // Create circular clipped version in canvas
          const canvas = document.createElement("canvas");
          canvas.width = photoSize * 4;
          canvas.height = photoSize * 4;
          const ctx = canvas.getContext("2d");
  
          // Draw circular mask
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
  
          // Draw the image inside the circle
          ctx.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
  
          // Convert clipped image to base64
          const clippedImage = canvas.toDataURL("image/jpeg", 1.0);
  
          // Add clipped image to PDF
          pdf.addImage(clippedImage, "JPEG", photoX, photoY, photoSize, photoSize);
  
          // Add circular border
          pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.setLineWidth(0.5);
          pdf.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, "S");
  
          photoYOffset = 40;
        } catch (error) {
          console.error("Error adding photo to PDF:", error);
        }
        resolve(true);
      };
  
      photoImg.onerror = () => {
        console.warn("Profile photo failed to load, using default avatar.");
        const fallbackImg = new Image();
        fallbackImg.src = "/default_avatar.jpg"; // <-- updated to .jpg
        fallbackImg.onload = () => {
          const photoX = 20;
          const photoY = 50;
          const photoSize = 30;
          pdf.addImage(fallbackImg, "JPEG", photoX, photoY, photoSize, photoSize);
          pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.setLineWidth(0.5);
          pdf.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, "S");
          photoYOffset = 40;
          resolve(true);
        };
        fallbackImg.onerror = () => resolve(false);
      };
    });
  } catch (error) {
    console.error("Error loading profile photo:", error);
  }


  // --- Top-right: "Ram Ram {First Name}" ---
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  // Extract first name only
  const firstName = data.studentName ? data.studentName.split(" ")[0] : "";
  const headerText = `Ram Ram ${firstName}`;
  
  // Dynamically align to right edge
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.text(headerText, pageWidth - 20, 65, { align: "right" });

  // Date
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(10);
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  pdf.text(`Date: ${currentDate}`, 20, 55 + photoYOffset);

  // Student Details Section
  let yPos = 70 + photoYOffset;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Student Details", 20, yPos);
  
  yPos += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPos, 190, yPos);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  
  yPos += 10;
  const lineHeight = 8;
  
  pdf.setFont("helvetica", "bold");
  pdf.text("Name:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.studentName, 60, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Student ID:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.studentId, 60, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Joining Date:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(new Date(data.joiningDate).toLocaleDateString("en-IN"), 60, yPos);
  
  if (data.subject) {
    yPos += lineHeight;
    pdf.setFont("helvetica", "bold");
    pdf.text("Subject:", 20, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.subject, 60, yPos);
  }
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "bold");
  pdf.text("Monthly Fee:", 20, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Rs. ${data.monthlyFee.toLocaleString("en-IN")}`, 60, yPos);

  // Fee Details Section
  yPos += lineHeight + 8;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Fee Details", 20, yPos);
  
  yPos += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPos, 190, yPos);

  yPos += 10;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pending Months:", 20, yPos);
  
  yPos += lineHeight;
  pdf.setFont("helvetica", "normal");
  
  // Display pending months
  if (data.pendingMonths.length > 0) {
    const monthsText = data.pendingMonths.join(", ");
    const splitMonths = pdf.splitTextToSize(monthsText, 170);
    pdf.text(splitMonths, 20, yPos);
    yPos += splitMonths.length * lineHeight;
  } else {
    pdf.text("No pending months", 20, yPos);
    yPos += lineHeight;
  }

  // Paused Months Section (only if paused months exist)
  if (data.pausedMonths && data.pausedMonths.length > 0) {
    yPos += 8;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.text("Paused Months:", 20, yPos);
    
    yPos += lineHeight;
    pdf.setFont("helvetica", "normal");
    const pausedText = data.pausedMonths.map(pm => formatPausedMonth(pm)).join(", ");
    const splitPaused = pdf.splitTextToSize(pausedText, 170);
    pdf.text(splitPaused, 20, yPos);
    yPos += splitPaused.length * lineHeight;
  }

  // Total Due Box
  yPos += 8;
  pdf.setFillColor(255, 243, 224);
  pdf.roundedRect(20, yPos - 5, 170, 20, 3, 3, "F");
  
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(217, 119, 6);
  pdf.text("TOTAL DUE:", 30, yPos + 5);
  pdf.text(`Rs. ${data.totalDue.toLocaleString("en-IN")}`, 160, yPos + 5, { align: "right" });

  // Signature Section
  yPos += 35;
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  
  // Load and add signature image
  try {
    const signatureUrl = "/My_signature.jpeg";
    const img = new Image();
    img.src = signatureUrl;
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        // Add signature image
        pdf.addImage(img, "JPEG", 130, yPos, 50, 20);
        
        // Signature line and text
        pdf.line(130, yPos + 22, 180, yPos + 22);
        pdf.setFontSize(10);
        pdf.text("Authorized Signature", 155, yPos + 28, { align: "center" });
        resolve(true);
      };
      img.onerror = reject;
    });
  } catch (error) {
    console.error("Error loading signature:", error);
    // Fallback: just draw the line without image
    pdf.line(130, yPos + 22, 180, yPos + 22);
    pdf.setFontSize(10);
    pdf.text("Authorized Signature", 155, yPos + 28, { align: "center" });
  }

  // Footer
  pdf.setFontSize(9);
  pdf.setTextColor(128, 128, 128);
  pdf.text("This is a computer-generated receipt", 105, 280, { align: "center" });

  // Generate blob for WhatsApp sharing
  const pdfBlob = pdf.output("blob");
  
  // Auto-download
  pdf.save(`Receipt_${data.studentName.replace(/\s+/g, "_")}_${currentDate.replace(/\s+/g, "_")}.pdf`);

  return pdfBlob;
};
