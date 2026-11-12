import { CategoriaGestionService } from '../../../core/services/categoria-gestion';
import { inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Categoria, Genero, Producto } from '../../../core/models/producto';
import { ProductoService } from '../../../core/services/producto';
import { ImagenService } from '../../../core/services/imagen';
import { ProductoImagenService } from '../../../core/services/producto-imagen';
import { ProductoImagen } from '../../../core/models/producto-imagen';
import { finalize, from, concatMap, toArray } from 'rxjs';
import { VariantesEditor } from '../variantes-editor/variantes-editor';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [FormsModule, RouterLink, VariantesEditor],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css'
})
export class ProductoForm implements OnInit {
  private readonly categoriaGestionService = inject(CategoriaGestionService);
  private readonly http = inject(HttpClient);

  modoColorTalla = false;
  coloresGaleria: {
    idColor: number;
    nombre: string;
    codigoHex: string;
    activo: boolean;
  }[] = [];

  colorAsignandoId: number | null = null;
  errorColorFoto = '';
  readonly maximoFotos = 12;
  galeria: ProductoImagen[] = [];
  archivosGaleria: File[] = [];
  cargandoGaleria = false;
  subiendoGaleria = false;
  errorGaleria = '';
  mensajeGaleria = '';
  eliminandoFoto: number | null = null;
  idProducto: number | null = null;
  editando = false;
  cargando = false;
  guardando = false;
  subiendoImagen = false;
  error = '';
  errorImagen = '';
  nombre = '';
  descripcion = '';
  precio: number | null = null;
  precioOferta: number | null = null;
  idGenero: number | null = null;
  idCategoria: number | null = null;
  imagen: string | null = null;
  archivoImagen: File | null = null;
  previewImagen: string | null = null;
  nuevo = false;
  destacado = false;
  estado = true;
  tipoVariantes: string | null = null;
  sistemaTallas: string | null = null;

  private readonly uploadsUrl = `${environment.apiUrl}/uploads/`;

  generos: Genero[] = [];

  categorias: Categoria[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService,
    private imagenService: ImagenService,
    private productoImagenService: ProductoImagenService
  ) {}

  ngOnInit(): void {
    this.http.get<Genero[]>(`${environment.apiUrl}/api/generos`)
      .subscribe({
        next: datos => {
          this.generos = (Array.isArray(datos) ? datos : [])
            .filter(g => g.estado === true);
        },
        error: err => {
          console.error('Error cargando generos:', err);
          this.error = 'No se pudieron cargar los generos.';
        }
      });
    // Listado real del administrador autenticado; no usar categorias fijas.
    this.categoriaGestionService.listar().subscribe({
      next: (datos) => {
        this.categorias = (Array.isArray(datos) ? datos : [])
          .filter((categoria) => categoria.estado === true);
      },
      error: (error) => {
        console.error('No se pudieron cargar las categorias de esta tienda', error);
        this.categorias = [];
      }
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id > 0) {
      this.idProducto = id;
      this.editando = true;
      this.cargarProducto(id);
      this.cargarGaleria(id);
      this.productoService.buscarPorId(id).subscribe({
        next: producto => {
          const p = producto as Producto & {
            tipoVariantes?: string | null
          };

          this.modoColorTalla =
            p.tipoVariantes === 'COLOR_Y_TALLA';

          if (this.modoColorTalla) {
            this.productoImagenService.listarColores().subscribe({
              next: colores => {
                this.coloresGaleria = (colores ?? [])
                  .filter(c => c.activo !== false);
              },
              error: () => {
                this.errorColorFoto =
                  'No se pudieron cargar los colores de esta tienda.';
              }
            });
          }
        },
        error: () => {
          this.errorColorFoto =
            'No se pudo comprobar la modalidad del producto.';
        }
      });
    }
  }

  get cuposDisponibles(): number {
    return Math.max(0, this.maximoFotos - (this.imagen ? 1 : 0) - this.galeria.length - this.archivosGaleria.length);
  }

  cargarGaleria(id: number): void {
    this.cargandoGaleria = true;
    this.errorGaleria = '';
    this.productoImagenService.listarAdmin(id).subscribe({
      next: fotos => {
        this.galeria = [...(fotos ?? [])].sort((a, b) => a.orden - b.orden);
        this.cargandoGaleria = false;
      },
      error: e => {
        console.error('Galería administrativa:', e);
        this.errorGaleria = 'No se pudo consultar la galería.';
        this.cargandoGaleria = false;
      }
    });
  }

  asignarColorFoto(foto: ProductoImagen, event: Event): void {
    if (!this.modoColorTalla || this.colorAsignandoId !== null) {
      return;
    }

    const selector = event.target as HTMLSelectElement;
    const anterior = foto.idColor ?? null;
    const nuevoId = selector.value === ''
      ? null
      : Number(selector.value);

    if (nuevoId !== null && !Number.isSafeInteger(nuevoId)) {
      selector.value = anterior === null ? '' : String(anterior);
      return;
    }

    this.colorAsignandoId = foto.idProductoImagen;
    this.errorColorFoto = '';
    this.mensajeGaleria = '';

    this.productoImagenService
      .asignarColor(foto.idProductoImagen, nuevoId)
      .subscribe({
        next: respuesta => {
          foto.idColor = respuesta.idColor;
          this.colorAsignandoId = null;
          this.mensajeGaleria =
            'Color de fotografía guardado correctamente.';
        },
        error: error => {
          console.error('Error al asignar color:', error);
          selector.value = anterior === null ? '' : String(anterior);
          this.colorAsignandoId = null;
          this.errorColorFoto =
            'No se pudo asignar el color a esta fotografía.';
        }
      });
  }
  seleccionarGaleria(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.errorGaleria = '';
    this.mensajeGaleria = '';
    const nuevos = Array.from(input.files ?? []);
    input.value = '';
    if (nuevos.length > this.cuposDisponibles) {
      this.errorGaleria = `Solo puedes agregar ${this.cuposDisponibles} fotografía(s) más.`;
      return;
    }
    for (const archivo of nuevos) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
        this.errorGaleria = 'Solo JPG, PNG y WEBP.';
        return;
      }
      if (archivo.size === 0 || archivo.size > 5 * 1024 * 1024) {
        this.errorGaleria = 'Cada imagen debe pesar entre 1 byte y 5 MB.';
        return;
      }
    }
    this.archivosGaleria = [...this.archivosGaleria, ...nuevos];
  }

  quitarPendiente(indice: number): void {
    this.archivosGaleria = this.archivosGaleria.filter((_, i) => i !== indice);
  }

  subirGaleria(): void {
    if (!this.idProducto || this.subiendoGaleria || !this.archivosGaleria.length) return;
    const archivos = [...this.archivosGaleria];
    const id = this.idProducto;
    this.subiendoGaleria = true;
    this.errorGaleria = '';
    this.mensajeGaleria = '';
    // Cargas secuenciales: cada archivo conserva su posición.
    from(archivos).pipe(
      concatMap((archivo, indice) => this.productoImagenService.subir(id, archivo, this.galeria.length + indice + 1)),
      toArray(),
      finalize(() => { this.subiendoGaleria = false; this.cargarGaleria(id); })
    ).subscribe({
      next: () => { this.archivosGaleria = []; this.mensajeGaleria = 'Fotografías guardadas correctamente.'; },
      error: e => {
        console.error(e);
        this.errorGaleria = 'La carga se interrumpió. Algunas fotografías podrían haberse guardado. Verifica la galería antes de reintentar.';
        this.archivosGaleria = [];
      }
    });
  }

  eliminarFoto(foto: ProductoImagen): void {
    if (!this.idProducto || this.eliminandoFoto !== null || !window.confirm('¿Eliminar esta fotografía de la galería?')) return;
    this.eliminandoFoto = foto.idProductoImagen;
    this.errorGaleria = '';
    this.productoImagenService.eliminar(foto.idProductoImagen).subscribe({
      next: () => {
        this.eliminandoFoto = null;
        this.cargarGaleria(this.idProducto!);
      },
      error: e => {
        console.error(e);
        this.eliminandoFoto = null;
        this.errorGaleria = 'No se pudo eliminar la fotografía.';
      }
    });
  }

  fotoUrl(ruta: string): string {
    if (/^https?:\/\//i.test(ruta)) return ruta;
    return this.uploadsUrl + ruta.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
  }

  // =========================================================
  // CARGAR PRODUCTO
  // =========================================================
  cargarProducto(idProducto: number): void {
    this.cargando = true;

    this.productoService.buscarAdmin(idProducto).subscribe({
      next: producto => {
        this.nombre = producto.nombre;
        this.descripcion = producto.descripcion ?? '';
        this.precio = producto.precio;
        this.precioOferta = producto.precioOferta;
        this.idGenero = producto.genero?.idGenero ?? null;
        this.idCategoria = producto.categoria?.idCategoria ?? null;
        this.imagen = producto.imagen;
        this.nuevo = producto.nuevo;
        this.destacado = producto.destacado;
        this.estado = producto.estado;
        const conVariantes = producto as Producto & { tipoVariantes?: string | null; sistemaTallas?: string | null };
        this.tipoVariantes = conVariantes.tipoVariantes ?? null;
        this.sistemaTallas = conVariantes.sistemaTallas ?? null;
        this.cargando = false;
      },
      error: error => {
        console.error(error);
        this.error = this.obtenerMensajeError(error, 'No se pudo cargar el producto.');
        this.cargando = false;
      }
    });
  }

  // =========================================================
  // SELECCIONAR IMAGEN
  // =========================================================
  seleccionarImagen(event: Event): void {
    this.errorImagen = '';
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(archivo.type)) {
      this.errorImagen = 'Solo se permiten imágenes JPG, PNG o WEBP.';
      input.value = '';
      return;
    }

    const maximo = 5 * 1024 * 1024;

    if (archivo.size > maximo) {
      this.errorImagen = 'La imagen no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.archivoImagen = archivo;

    if (this.previewImagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewImagen);
    }

    this.previewImagen = URL.createObjectURL(archivo);
  }

  // =========================================================
  // QUITAR IMAGEN SELECCIONADA
  // =========================================================
  cancelarImagen(): void {
    if (this.previewImagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewImagen);
    }

    this.archivoImagen = null;
    this.previewImagen = null;
    this.errorImagen = '';
  }

  // =========================================================
  // URL DE IMAGEN
  // =========================================================
  imagenActualUrl(): string | null {
    if (this.previewImagen) return this.previewImagen;
    if (this.imagen) return this.uploadsUrl + this.imagen;
    return null;
  }

  // =========================================================
  // GUARDAR
  // =========================================================
  guardar(): void {
    this.error = '';
    this.errorImagen = '';

    if (!this.nombre.trim()) {
      this.error = 'Ingresa el nombre.';
      return;
    }

    if (this.nombre.trim().length > 150) {
      this.error = 'El nombre no puede superar los 150 caracteres.';
      return;
    }

    if (this.descripcion.trim().length > 1000) {
      this.error = 'La descripción no puede superar los 1000 caracteres.';
      return;
    }

    if (this.precio == null || this.precio <= 0) {
      this.error = 'El precio debe ser mayor que cero.';
      return;
    }

    if (this.precioOferta != null && this.precioOferta <= 0) {
      this.error = 'El precio de oferta debe ser mayor que cero.';
      return;
    }

    if (this.precioOferta != null && this.precioOferta >= this.precio) {
      this.error = 'El precio de oferta debe ser menor al precio normal.';
      return;
    }

    if (!this.idGenero || !this.idCategoria) {
      this.error = 'Selecciona género y categoría.';
      return;
    }

    this.guardando = true;

    if (this.archivoImagen) {
      this.subirImagenYGuardar();
      return;
    }

    this.guardarProducto();
  }

  // =========================================================
  // SUBIR IMAGEN
  // =========================================================
  private subirImagenYGuardar(): void {
    if (!this.archivoImagen) {
      this.guardarProducto();
      return;
    }

    this.subiendoImagen = true;

    this.imagenService.subirProducto(this.archivoImagen).subscribe({
      next: nombreArchivo => {
        this.imagen = nombreArchivo.trim();
        this.subiendoImagen = false;
        this.guardarProducto();
      },
      error: error => {
        console.error('Error subiendo imagen:', error);
        this.errorImagen = this.obtenerMensajeError(error, 'No se pudo subir la imagen.');
        this.subiendoImagen = false;
        this.guardando = false;
      }
    });
  }

  // =========================================================
  // CREAR / ACTUALIZAR PRODUCTO
  // =========================================================
  private guardarProducto(): void {
    if (!this.idGenero || !this.idCategoria) {
      this.guardando = false;
      return;
    }

    const producto: Partial<Producto> = {
      nombre: this.nombre.trim(),
      descripcion: this.descripcion.trim(),
      precio: Number(this.precio),
      precioOferta: this.precioOferta != null ? Number(this.precioOferta) : null,
      imagen: this.imagen,
      nuevo: this.nuevo,
      destacado: this.destacado,
      estado: this.estado
    };

    if (this.editando && this.idProducto) {
      this.productoService.actualizar(
        this.idProducto,
        producto,
        this.idGenero,
        this.idCategoria
      ).subscribe({
        next: () => this.router.navigate(['/admin/productos']),
        error: error => {
          console.error(error);
          this.error = this.obtenerMensajeError(error, 'No se pudo actualizar el producto.');
          this.guardando = false;
        }
      });

      return;
    }

    this.productoService.crear(
      producto,
      this.idGenero,
      this.idCategoria
    ).subscribe({
      next: creado => this.router.navigate(['/admin/productos', creado.idProducto, 'editar']),
      error: error => {
        console.error(error);
        this.error = this.obtenerMensajeError(error, 'No se pudo crear el producto.');
        this.guardando = false;
      }
    });
  }

  // =========================================================
  // MENSAJE DEL BACKEND
  // =========================================================
  private obtenerMensajeError(error: any, mensajeDefecto: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    return mensajeDefecto;
  }
}
