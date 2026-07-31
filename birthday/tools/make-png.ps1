# Converts images/bouquet.jpg into a transparent-background images/bouquet.png.
# The white studio backdrop is removed with a border flood-fill (not a plain
# threshold) so the near-white astilbe flowers inside the bouquet are kept.
# Run:  powershell -ExecutionPolicy Bypass -File tools\make-png.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'images\bouquet.jpg'
$dst  = Join-Path $root 'images\bouquet.png'

Add-Type -AssemblyName System.Drawing

$code = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Cutout
{
    // thresh: a pixel counts as backdrop when R,G,B are all >= thresh
    // soft:   edge pixels above this get partial alpha for a soft cut
    public static string Run(string src, string dst, int thresh, int soft, int pad, int maxSide)
    {
        using (Bitmap orig = new Bitmap(src))
        {
            int w = orig.Width, h = orig.Height;
            Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp)) { g.DrawImage(orig, 0, 0, w, h); }

            Rectangle full = new Rectangle(0, 0, w, h);
            BitmapData bd = bmp.LockBits(full, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] px = new byte[stride * h];
            Marshal.Copy(bd.Scan0, px, 0, px.Length);

            bool[] bg = new bool[w * h];
            Queue<int> q = new Queue<int>();

            // Seed the flood fill from every border pixel that is backdrop-white.
            for (int x = 0; x < w; x++) { Seed(px, stride, bg, q, w, x, 0, thresh); Seed(px, stride, bg, q, w, x, h - 1, thresh); }
            for (int y = 0; y < h; y++) { Seed(px, stride, bg, q, w, 0, y, thresh); Seed(px, stride, bg, q, w, w - 1, y, thresh); }

            while (q.Count > 0)
            {
                int idx = q.Dequeue();
                int cx = idx % w, cy = idx / w;
                Visit(px, stride, bg, q, w, h, cx - 1, cy, thresh);
                Visit(px, stride, bg, q, w, h, cx + 1, cy, thresh);
                Visit(px, stride, bg, q, w, h, cx, cy - 1, thresh);
                Visit(px, stride, bg, q, w, h, cx, cy + 1, thresh);
            }

            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++)
            {
                int row = y * stride;
                for (int x = 0; x < w; x++)
                {
                    int p = row + x * 4;
                    int i = y * w + x;
                    if (bg[i]) { px[p + 3] = 0; continue; }

                    // Soften pixels that sit right against the removed backdrop.
                    if (Touches(bg, w, h, x, y))
                    {
                        int m = Math.Min(px[p], Math.Min(px[p + 1], px[p + 2]));
                        if (m > soft)
                        {
                            double a = (255.0 - m) / (255.0 - soft) * 255.0;
                            px[p + 3] = (byte)Math.Max(0, Math.Min(255, a));
                        }
                    }
                    if (px[p + 3] > 8)
                    {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            Marshal.Copy(px, 0, bd.Scan0, px.Length);
            bmp.UnlockBits(bd);

            if (maxX < 0) { bmp.Save(dst, ImageFormat.Png); bmp.Dispose(); return w + "x" + h + " (nothing removed)"; }

            // Trim the empty margins, then scale down so the PNG stays web-sized.
            minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad); maxY = Math.Min(h - 1, maxY + pad);
            int cw = maxX - minX + 1, ch = maxY - minY + 1;

            double scale = 1.0;
            int longest = Math.Max(cw, ch);
            if (maxSide > 0 && longest > maxSide) scale = (double)maxSide / longest;
            int ow = Math.Max(1, (int)Math.Round(cw * scale));
            int oh = Math.Max(1, (int)Math.Round(ch * scale));

            using (Bitmap outBmp = new Bitmap(ow, oh, PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(outBmp))
                {
                    g.Clear(Color.Transparent);
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    g.DrawImage(bmp, new Rectangle(0, 0, ow, oh), new Rectangle(minX, minY, cw, ch), GraphicsUnit.Pixel);
                }
                outBmp.Save(dst, ImageFormat.Png);
            }
            bmp.Dispose();
            return w + "x" + h + " -> cropped " + cw + "x" + ch + " -> saved " + ow + "x" + oh;
        }
    }

    static bool White(byte[] px, int stride, int w, int x, int y, int thresh)
    {
        int p = y * stride + x * 4;
        return px[p] >= thresh && px[p + 1] >= thresh && px[p + 2] >= thresh;
    }

    static void Seed(byte[] px, int stride, bool[] bg, Queue<int> q, int w, int x, int y, int thresh)
    {
        int i = y * w + x;
        if (bg[i]) return;
        if (!White(px, stride, w, x, y, thresh)) return;
        bg[i] = true; q.Enqueue(i);
    }

    static void Visit(byte[] px, int stride, bool[] bg, Queue<int> q, int w, int h, int x, int y, int thresh)
    {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        Seed(px, stride, bg, q, w, x, y, thresh);
    }

    static bool Touches(bool[] bg, int w, int h, int x, int y)
    {
        for (int dy = -1; dy <= 1; dy++)
        {
            for (int dx = -1; dx <= 1; dx++)
            {
                int nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                if (bg[ny * w + nx]) return true;
            }
        }
        return false;
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$result = [Cutout]::Run($src, $dst, 236, 200, 6, 1000)
Write-Output $result
Write-Output ("{0:N0} KB -> {1}" -f ((Get-Item $dst).Length / 1KB), $dst)
